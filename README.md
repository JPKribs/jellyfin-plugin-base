# ![Jellyfin Plugin Base](Assets/Logo.png)

Shared configuration UI assets and C# helpers used by all my Jellyfin plugins, delivered as a NuGet package. The source and assets are compiled into the consuming plugin at build time, so each plugin stays a single DLL with nothing extra to ship.

## Components

* `jpkribs_shared.css` and `jpkribs_shared.js` embedded into the plugin assembly under its own namespace.
* `PluginBase<TPlugin, TConfiguration>`: singleton accessor, lock guarded config read and mutate, and `GetSharedPages()` to register the shared assets.

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
