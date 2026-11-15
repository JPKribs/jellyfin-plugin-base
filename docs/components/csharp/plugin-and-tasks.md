# Plugin and Tasks

The plugin base class, scheduled tasks, bounded parallel work, and the DI registration helpers every plugin starts from.

## PluginBase

The base class for a plugin. It gives a plugin the singleton `Instance`, a lock around configuration reads and writes, a hook that runs before the dashboard's save is stored, and the registration of the shared CSS and JS pages.

Use it for every JPKribs plugin. Derive from `BasePlugin<T>` directly for a plugin that needs neither locked configuration access nor the shared pages.

```csharp
public sealed class Plugin : PluginBase<Plugin, PluginConfiguration>
{
    public const string SecretsName = "Jellyfin.Plugin.MyPlugin";

    private readonly SecretProtector _secrets;

    public Plugin(IApplicationPaths paths, IXmlSerializer xml, ILogger<Plugin> logger)
        : base(paths, xml)
    {
        _secrets = StableSecretProtection.CreateProtector(paths, SecretsName, logger);
    }

    public override Guid Id => Guid.Parse("6b1d7c4e-0a1f-4f7e-9b55-1f1e5d0c2a11");

    public override string Name => "My Plugin";

    public override IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo { Name = "myplugin", EmbeddedResourcePath = GetType().Namespace + ".Configuration.myplugin.html" };
        foreach (var page in GetSharedPages("myplugin"))
        {
            yield return page;
        }
    }

    protected override void OnConfigurationSaving(PluginConfiguration incoming, PluginConfiguration stored)
    {
        // Runs under the configuration lock. Throw to reject the save.
        incoming.ApiKey = _secrets.ResolveIncoming(incoming.ApiKey, stored.ApiKey);
    }
}

// Elsewhere in the plugin:
Plugin.Instance!.MutateConfiguration(c => { c.Counter++; return true; });
var counter = Plugin.Instance!.ReadConfiguration(c => c.Counter);
```

**Gotchas**

* The lock covers `MutateConfiguration`, `ReadConfiguration`, and the dashboard's save. Reading `Configuration` directly is not locked.
* `MutateConfiguration` saves only when the delegate returns true, and it does not call `OnConfigurationSaving`. That hook runs for the dashboard's save only.
* `ReadConfiguration` returns whatever the delegate returns. Never return the live configuration object to a caller that mutates it later.
* The prefix passed to `GetSharedPages` must match the prefix the page markup uses, as in `configurationpage?name=myplugin_jpkribs_shared.css`. The registry is server wide, so choose one prefix per plugin.
* When `GetSharedPages` finds no embedded resource, or several, for a file, it still returns the namespace based name and Jellyfin then serves nothing for that page. Check the embed when a shared file returns empty.
* `Instance` is static, never cleared, and one value per closed generic type. It is null until the constructor has run.

## PluginScheduledTask

The abstract base for a Jellyfin scheduled task. It fills in the usual defaults and offers trigger builders, so a task declares only its name, key, description, and work.

Use it for every plugin task. Use a hosted service for one-off background work.

```csharp
public sealed class SweepTask : PluginScheduledTask
{
    private readonly SweepService _service;

    public SweepTask(SweepService service) => _service = service;

    public override string Name => "Verify Requests";

    public override string Key => "RequestsSweep";

    public override string Description => "Marks open requests available when they are in the library.";

    public override string Category => "Requests";

    public override async Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        await _service.SweepAsync(progress, cancellationToken).ConfigureAwait(false);
        progress.Report(100);
    }

    public override IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return OnStartup();
        yield return EveryInterval(TimeSpan.FromHours(6));
    }
}
```

**Gotchas**

* `Category` defaults to "Maintenance", and `GetDefaultTriggers` defaults to no triggers. A task that does not override it never runs on a schedule.
* `EveryInterval` does not validate the interval. `Daily` takes a time of day in server local time.
* The class implements `IScheduledTask` and `IConfigurableScheduledTask`.

## TaskTriggers

Builds the default trigger entries of a scheduled task. `PluginScheduledTask` delegates its own builders here, so call `TaskTriggers` only from a task that does not derive from it.

```csharp
public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
{
    yield return TaskTriggers.OnStartup();
    yield return TaskTriggers.Daily(TimeSpan.FromHours(3));
    yield return TaskTriggers.EveryInterval(TimeSpan.FromHours(6));
}
```

**Gotchas**

* `EveryInterval` does not validate the period, and `OnStartup` fires every time the server starts.

## ConcurrentTaskRunner

Runs an async worker over a collection with a cap on parallelism, and reports progress from 0 to 100 as items finish. A task body reduces to "for each item, do the work".

Use it inside `PluginScheduledTask.ExecuteAsync` or any batch job. Do not use it for work that needs ordering, since items run in no fixed order.

```csharp
await ConcurrentTaskRunner.RunAsync(
    inFlight,
    async (request, ct) =>
    {
        try
        {
            await SyncOneAsync(request, ct).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Updating request {Id} failed", request.Id);
        }
    },
    maxParallelism: 4,
    progress: progress,
    cancellationToken: cancellationToken).ConfigureAwait(false);
```

**Gotchas**

* A worker that throws stops the batch. The first exception cancels the rest and propagates as itself, not wrapped. A worker that catches its own errors never stops the batch.
* Progress is reported from worker threads. A `Progress<double>` posts to the captured context, so reports can arrive out of order. Use a synchronous `IProgress<double>` when order matters.
* A `maxParallelism` below 1 becomes 1. An empty collection reports 100 and returns.

## ServiceCollectionExtensions

`ServiceCollectionExtensions` registers the two helpers a plugin's `IPluginServiceRegistrator` would otherwise wire by hand. `AddActivityLogger` adds the `ActivityLogger` singleton, and `AddPluginSecretProtector` adds a `SecretProtector` built by `StableSecretProtection.CreateProtector` under the plugin name.

```csharp
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // Encrypts stored secrets. Keys live in a fixed folder with a pinned application name.
        serviceCollection.AddPluginSecretProtector(Plugin.SecretsName);

        // The shared writer for Jellyfin's activity log.
        serviceCollection.AddActivityLogger();
    }
}
```

Inject `SecretProtector` and `ActivityLogger` into services by constructor. Code outside DI, such as the plugin class and static helpers, uses `ActivityLogger.Current`, or builds a protector under the same name with `StableSecretProtection.CreateProtector`.

**Gotchas**

* Both methods use `AddSingleton`, not `TryAdd`. Calling one twice registers two descriptors, and the last one wins on resolve.
* `AddPluginSecretProtector` shares its key ring with a protector the plugin class builds under the same name. Without `IApplicationPaths` in the container, the protector stores plaintext.
* `ActivityLogger.Current` is set only after DI first resolves the logger.
