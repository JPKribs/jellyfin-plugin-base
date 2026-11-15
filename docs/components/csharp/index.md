# C# Components

The C# helpers that `JPKribs.Jellyfin.Base` compiles into every plugin. These pages cover what each type is for, when to use it, how to wire it, and what can surprise you. The XML docs in the source are the reference for members and signatures, so your editor shows them as you type.

## What the Package Is

Base is a NuGet package of shared helpers for the Jellyfin plugins in this family. Every type lives in one namespace, `JPKribs.Jellyfin.Base`.

The package has no runtime assembly. It holds these files, and its targets file wires them into the plugin.

| Path in the package | What it holds | What the plugin build does with it |
| :--- | :--- | :--- |
| `src/*.cs` | The C# helpers | Compiles them into the plugin DLL |
| `assets/jpkribs_shared.css` and `assets/jpkribs_shared.js` | The bundled web components | Embeds them as `<RootNamespace>.Configuration.jpkribs_shared.css` and `.js` |
| `assets/jpkribs_shared.d.ts` | The typings of the JavaScript | Copies them to the plugin's `obj/` folder for the editor and never embeds them |
| `templates/*.html` | The HTML templates, such as `status.html` | Embeds each as `<RootNamespace>.Templates.<name>.html` |
| `build/JPKribs.Jellyfin.Base.targets` | The build wiring | Runs in every build of the plugin |
| `README.md` | The package readme | Nothing |

Add one reference and nothing else ships. See [Using Base](../../Usage.md) for the steps.

* All public types are compiled into the plugin, used or not.
* The package declares no dependencies of its own. The plugin must reference `Jellyfin.Controller` and `Jellyfin.Model`, which bring the `MediaBrowser.*`, ASP.NET Core, and Data Protection types the sources compile against. Without them the build fails in the Base sources.
* The sources are compiled with the plugin's own analyzer settings, so a warning in a source file fails the plugin's build.
* `ActivityLogger.Current`, `PluginBase.Instance`, the `TemplateLoader` cache, and the `StableSecretProtection` provider cache are static state inside the plugin's own copy of the code. Two plugins never share them.
* The package version is a date, such as `2026.11.13.3`.

In these pages, "plugin" means the consuming Jellyfin plugin, "task" means a Jellyfin scheduled task, and "entry" means one row of Jellyfin's activity log. The page and anchor for each type are listed below. For the web half of Base, see [Web Components](../web/index.md).

## Types

| Type | What it is for | Page |
| :--- | :--- | :--- |
| `ActivityLogger` | Writes entries to Jellyfin's activity log without ever throwing. | [Activity Log](activity-log.md#activitylogger) |
| `ActivityOutcome` | Defines one kind of summary entry. | [Activity Log](activity-log.md#activityoutcome) |
| `ActivitySummary` | Sums events into one activity entry per outcome. | [Activity Log](activity-log.md#activitysummary) |
| `ActivityTally` | Holds the counts an outcome's overview is built from. | [Activity Log](activity-log.md#activitytally) |
| `ActivityText` | Shared wording for counts, plurals, lists, and sentences. | [Activity Log](activity-log.md#activitytext) |
| `AtomicFile` | Replaces a file through a temp file so a reader never sees half of it. | [Files and Paths](files-and-paths.md#atomicfile) |
| `BackoffPolicy` | A stateless exponential pause for a repeatedly failing record. | [HTTP and Resilience](http-and-resilience.md#backoffpolicy) |
| `BackoffState` | The failure count and pause deadline a caller stores per record. | [HTTP and Resilience](http-and-resilience.md#backoffstate) |
| `ByteSize` | Binary byte counts as `long` constants. | [Streams and Throttling](streams-and-throttling.md#bytesize) |
| `CappedReadStream` | A read through stream that throws past a limit. | [Streams and Throttling](streams-and-throttling.md#cappedreadstream) |
| `CircuitBreaker` | Stops calls to a named service after repeated failures, for a cooldown. | [HTTP and Resilience](http-and-resilience.md#circuitbreaker) |
| `ConcurrentTaskRunner` | Runs a worker over items with bounded parallelism and progress. | [Plugin and Tasks](plugin-and-tasks.md#concurrenttaskrunner) |
| `DatabaseSchema` | Versions a SQLite database with a minimum reader and a backup. | [Data and Storage](data-and-storage.md#databaseschema) |
| `FaviconResolver` | Finds the web client's favicon on disk. | [Pages and Templates](pages-and-templates.md#faviconresolver) |
| `FileNameSanitizer` | Makes a string a safe cross-platform file name. | [Files and Paths](files-and-paths.md#filenamesanitizer) |
| `FormatUtilities` | Formats byte counts and makes text safe for a log. | [Text and Formatting](text-and-formatting.md#formatutilities) |
| `HashUtilities` | Short SHA-256 fingerprints and the full SHA-256 hex of a string. | [Text and Formatting](text-and-formatting.md#hashutilities) |
| `HttpResult` | The status and body that `JpkHttp` returns. | [HTTP and Resilience](http-and-resilience.md#httpresult) |
| `HttpRetry` | Names the statuses worth asking again and reads Retry-After. | [HTTP and Resilience](http-and-resilience.md#httpretry) |
| `ItemTitles` | Names a library item as Jellyfin does. | [Text and Formatting](text-and-formatting.md#itemtitles) |
| `JpkHttp` | Outbound HTTP that returns a status and body and does not throw. | [HTTP and Resilience](http-and-resilience.md#jpkhttp) |
| `JpkRetryHandler` | A handler that retries a read for a gateway error or a slow answer. | [HTTP and Resilience](http-and-resilience.md#jpkretryhandler) |
| `JpkRetryOptions` | The attempts, waits, and timeout of a retry handler. | [HTTP and Resilience](http-and-resilience.md#jpkretryoptions) |
| `JsonFileStore` | A thread-safe atomic JSON file for one value. | [Data and Storage](data-and-storage.md#jsonfilestore) |
| `PagedQuery` | The skip, take, search, and filter a list endpoint receives. | [Data and Storage](data-and-storage.md#pagedquery) |
| `PagedResult` | One page of results with the count and page metadata. | [Data and Storage](data-and-storage.md#pagedresult) |
| `PagedResultExtensions` | `ToPagedResult` for an already filtered collection. | [Data and Storage](data-and-storage.md#pagedresultextensions) |
| `PathContainment` | Whether a folder is, or is inside, one of some folders. | [Files and Paths](files-and-paths.md#pathcontainment) |
| `PluginBase` | The plugin base class with locked configuration and shared pages. | [Plugin and Tasks](plugin-and-tasks.md#pluginbase) |
| `PluginScheduledTask` | A scheduled task base with defaults and trigger helpers. | [Plugin and Tasks](plugin-and-tasks.md#pluginscheduledtask) |
| `ProgressReportingStream` | A write through stream that reports a download's progress in whole percent steps. | [Streams and Throttling](streams-and-throttling.md#progressreportingstream) |
| `PublicPage` | Hardening headers and the favicon for standalone pages. | [Pages and Templates](pages-and-templates.md#publicpage) |
| `RateUtilities` | Converts Mbps and older units to bytes per second. | [Streams and Throttling](streams-and-throttling.md#rateutilities) |
| `RedirectRefusingHandler` | A handler that refuses a redirect and names the address it pointed to. | [HTTP and Resilience](http-and-resilience.md#redirectrefusinghandler) |
| `RetryPolicy` | Exponential backoff retry for transient exceptions. | [HTTP and Resilience](http-and-resilience.md#retrypolicy) |
| `SchemaAction` | What opening a database did or what the caller must do next. | [Data and Storage](data-and-storage.md#schemaaction) |
| `SecretCompare` | Constant time secret comparison and random tokens. | [Security and Secrets](security-and-secrets.md#secretcompare) |
| `SecretProtector` | Encrypts plugin secrets at rest with Data Protection. | [Security and Secrets](security-and-secrets.md#secretprotector) |
| `ServiceCollectionExtensions` | DI registration for the activity logger and the secret protector. | [Plugin and Tasks](plugin-and-tasks.md#servicecollectionextensions) |
| `SpeedBucket` | A bytes per second rate that several streams share. | [Streams and Throttling](streams-and-throttling.md#speedbucket) |
| `SsrfGuard` | Refuses private, loopback, link local, and other unsafe targets. | [HTTP and Resilience](http-and-resilience.md#ssrfguard) |
| `StableSecretProtection` | Builds the provider and protector with launch-independent keys. | [Security and Secrets](security-and-secrets.md#stablesecretprotection) |
| `StatusPage` | Renders the themed standalone status card. | [Pages and Templates](pages-and-templates.md#statuspage) |
| `StreamLimits` | Reads a stream into memory with a size limit. | [Streams and Throttling](streams-and-throttling.md#streamlimits) |
| `StreamUtilities` | Copies a stream, alone or under a shared speed limit. | [Streams and Throttling](streams-and-throttling.md#streamutilities) |
| `StringNormalizationUtility` | Puts a list of strings in a canonical form. | [Text and Formatting](text-and-formatting.md#stringnormalizationutility) |
| `StringUtilities` | Escapes text for a JavaScript string literal. | [Text and Formatting](text-and-formatting.md#stringutilities) |
| `TaskTriggers` | Builds default trigger entries for a scheduled task. | [Plugin and Tasks](plugin-and-tasks.md#tasktriggers) |
| `TemplateLoader` | Loads and fills embedded HTML templates. | [Pages and Templates](pages-and-templates.md#templateloader) |
| `ThrottledReadStream` | A read through stream held to the rate of a `SpeedBucket`. | [Streams and Throttling](streams-and-throttling.md#throttledreadstream) |
| `UrlUtilities` | Reads text as an absolute http or https URL. | [Security and Secrets](security-and-secrets.md#urlutilities) |
| `UtcTime` | Formats and parses stored times as UTC. | [Text and Formatting](text-and-formatting.md#utctime) |

## Pages

| Page | Covers |
| :--- | :--- |
| [Plugin and Tasks](plugin-and-tasks.md) | The plugin base, scheduled tasks, bounded parallel work, and DI registration. |
| [HTTP and Resilience](http-and-resilience.md) | Outbound HTTP, the SSRF guard, retries, the circuit breaker, and backoff. |
| [Security and Secrets](security-and-secrets.md) | Secrets at rest, constant time comparison, and URL checks. |
| [Files and Paths](files-and-paths.md) | File names, atomic writes, and folder containment. |
| [Streams and Throttling](streams-and-throttling.md) | Speed limits, shared rates, and size caps. |
| [Text and Formatting](text-and-formatting.md) | Log and JavaScript escaping, titles, string lists, and hashes. |
| [Data and Storage](data-and-storage.md) | SQLite versioning, JSON state files, and paged results. |
| [Pages and Templates](pages-and-templates.md) | Standalone status pages, templates, and favicons. |
| [Activity Log](activity-log.md) | Single and summed entries in Jellyfin's activity log. |

## Wiring Checklist

1. Reference the package, and reference `Jellyfin.Controller` and `Jellyfin.Model` too.
2. Derive the plugin class from `PluginBase`, and yield `GetSharedPages("<prefix>")` from `GetPages`.
3. Choose one stable plugin name for secrets, use the assembly name, and never change it.
4. In the service registrator, call `AddPluginSecretProtector(name)` and `AddActivityLogger()` as needed. See [ServiceCollectionExtensions](plugin-and-tasks.md#servicecollectionextensions).
5. Derive tasks from `PluginScheduledTask`.
6. Own the dispose of any `ActivitySummary` you create, so waiting events are written on shutdown.
7. For standalone pages, serve `StatusPage.Render` output with `PublicPage.ApplyHardeningHeaders` and a sibling `favicon.ico` route.
