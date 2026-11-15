# Using Base

How a plugin adds Base, registers its shared pages, and loads the shared CSS and JavaScript.

## Add the Package

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.10.28" />
```

The package compiles into the plugin. CSS and JavaScript are bundled by `scripts/bundle.sh` into `jpkribs_shared.css` and `jpkribs_shared.js`, and the plugin embeds them under its own name.

## Extend the Plugin Class

Extend `PluginBase` and add the shared pages to the plugin's pages.

```csharp
public class Plugin : PluginBase<Plugin, PluginConfiguration>
{
    public Plugin(IApplicationPaths paths, IXmlSerializer xml) : base(paths, xml) { }

    public override Guid Id => Guid.Parse("...");
    public override string Name => "My Plugin";

    public override IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo { Name = "myplugin", EmbeddedResourcePath = "..." };
        foreach (var page in GetSharedPages("myplugin"))
        {
            yield return page;
        }
    }
}
```

## Load the Assets

Reference the stylesheet from a configuration page.

```html
<link rel="stylesheet" href="configurationpage?name=myplugin_jpkribs_shared.css">
```

Import the JavaScript by a relative path, so the page works on a server hosted under a base URL.

```js
import { createShared, setTabs, initCollapsibles } from './configurationpage?name=myplugin_jpkribs_shared.js';
```

## Add Tabs

For a plugin with several tabs, register one native page per tab and call `setTabs` on `viewshow`.

```js
var TABS = [
    { href: 'configurationpage?name=myplugin_overview', name: 'Overview' },
    { href: 'configurationpage?name=myplugin_settings', name: 'Settings' }
];
setTabs('myplugin', 0, TABS);
```

## Next

* Build the page lifecycle with `createConfigPage`, described under [Web Components](components/web/index.md).
* Pick a helper from [C# Components](components/csharp/index.md).
