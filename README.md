# ![Jellyfin Plugin Base](Assets/Logo.png)

Shared configuration UI assets and C# helpers used in my Jellyfin plugins, delivered as a NuGet package. The source and assets are compiled into the consuming plugin at build time, so each plugin stays a single DLL with nothing extra to ship.

## Components

* `jpkribs_shared.css` and `jpkribs_shared.js` embedded into the plugin assembly under its own namespace.
* `PluginBase<TPlugin, TConfiguration>`: singleton accessor, lock guarded config read and mutate, and `GetSharedPages()` to register the shared assets.
* `PluginScheduledTask`: scheduled task base with the configurable task defaults and an `EveryInterval` trigger helper.
* `PagedResult<T>`, `PagedQuery`, and `ToPagedResult`: the page and count contract the shared paginated table reads.
* `JpkHttp` and `HttpResult`: outbound HTTP over Jellyfin's default client that returns a status and body and never throws on network failure.
* `StatusPage`: renders the themed status page from the `status` template.
* `TemplateLoader`: loads and fills HTML templates embedded from `templates/`.

## Usage

Add the package:

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.6.1" />
```

Extend the base and yield the shared pages:

```csharp
public class Plugin : PluginBase<Plugin, PluginConfiguration>
{
    public Plugin(IApplicationPaths paths, IXmlSerializer xml) : base(paths, xml) { }

    public override Guid Id => Guid.Parse("...");
    public override string Name => "My Plugin";

    public override IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo { Name = "myplugin", EmbeddedResourcePath = "..." };
        foreach (var page in GetSharedPages())
        {
            yield return page;
        }
    }
}
```

Reference the assets from a config page:

```html
<link rel="stylesheet" href="configurationpage?name=jpkribs_shared.css">
```

```js
import { createShared, getTabs, initCollapsibles } from '/web/configurationpage?name=jpkribs_shared.js';
```
