# Using Base

How a plugin adds Base, registers its shared pages, loads the shared CSS and JavaScript, and builds a configuration page with it.

## Add the Package

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="12.4.0" />
```

Use the latest version from nuget.org. A version starts with the Jellyfin version it targets, so `12.4.0` is for Jellyfin 12.4. The package has no runtime assembly, and the plugin stays one DLL. Building the plugin does five things.

| Piece | What happens |
| :--- | :--- |
| `src/*.cs` | Compiled into the plugin, under the plugin's own analyzers |
| `jpkribs_shared.css` and `jpkribs_shared.js` | Embedded as `<RootNamespace>.Configuration.jpkribs_shared.css` and `.js` |
| `templates/*.html` | Embedded as `<RootNamespace>.Templates.<name>.html`, for `TemplateLoader` and `StatusPage` |
| `jpkribs_shared.d.ts` | Copied to the plugin's `obj/` folder for the editor, and never embedded |
| `Localization/*.json` and `JellyfinString` items | Checked against Jellyfin's strings, then embedded as one file per language, with the `TranslationKeys` class. See [Translations](Translations.md) |

The web components are written in TypeScript. The package carries them as one bundled, minified ES module and the typings built from the same source. See [C# Components](components/csharp/index.md#what-the-package-is) for the full package contents.

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

`GetSharedPages("myplugin")` serves the bundles as `myplugin_jpkribs_shared.css` and `myplugin_jpkribs_shared.js`. Use your own prefix.

## Load the Assets

Reference the stylesheet from a configuration page. The page element needs the `pluginConfigurationPage` class, because the form rules and the token aliases are scoped to it.

```html
<link rel="stylesheet" href="configurationpage?name=myplugin_jpkribs_shared.css">
```

Import the JavaScript by a relative path, so the page works on a server hosted under a base URL.

```js
import { createConfigPage, createDataTable, confirmDialog } from './configurationpage?name=myplugin_jpkribs_shared.js';
```

## Typings

Each build copies the typings to `obj/jpkribs_shared.d.ts`. They describe every import from a path that ends in `jpkribs_shared.js`, so an editor completes each option and flags a wrong one. Add a `jsconfig.json` beside the plugin's csproj to use them.

```json
{
  "compilerOptions": { "module": "ESNext", "moduleResolution": "bundler", "target": "ES2020" },
  "include": ["Configuration/*.js", "obj/jpkribs_shared.d.ts"]
}
```

Add `"checkJs": true` to have the editor report a wrong call as an error. The typings never reach the plugin assembly.

## Build a Page

Call `createConfigPage` from the page controller. It builds the helper bag, runs `bind` once and `load` on every `viewshow`, and stops every poller and cleanup on `viewhide`.

```js
export default function (view) {
    createConfigPage(view, {
        pluginId: '00000000-0000-0000-0000-000000000000',
        apiPrefix: 'MyPlugin',
        bind: function (shared, page) { /* wire events once */ },
        load: function (shared, page) { /* load data on every viewshow */ }
    });
}
```

Validation applies by itself on a page built this way. Every field with `required`, `min`, `max`, `step`, `minlength`, `maxlength`, `pattern`, or a `number`, `url`, `email`, `time`, or `date` type is checked when the reader leaves it, and its message shows under it. A [Save Bar](components/web/save-bar.md) with `form` refuses to save while a field is invalid, and a page that saves another way calls `validateAll(root)` first. See [Field Message](components/web/field-message.md#validation).

The same pass adds the arrows to number fields and the picker icons to date and time fields. See [Config Page](components/web/config-page.md).

## Add Tabs

For a plugin with several tabs, register one native page per tab, and pass the tabs to `createConfigPage`.

```js
createConfigPage(view, {
    pluginId: '00000000-0000-0000-0000-000000000000',
    tabsKey: 'myplugin',
    tabIndex: 1,
    tabs: [
        { href: 'configurationpage?name=myplugin_overview', name: 'Overview' },
        { href: 'configurationpage?name=myplugin_settings', name: 'Settings' }
    ]
});
```

A page that does not use `createConfigPage` calls `setTabs('myplugin', 1, tabs)` on `viewshow`. See [Tabs](components/web/tabs.md).

## Next

* Find a page component under [Web Components](components/web/index.md), and read how the lists, tables, editors, and dialogs build on each other in [How Components Build on Each Other](components/web/index.md#how-components-build-on-each-other).
* Pick a helper from [C# Components](components/csharp/index.md).
* Show the plugin in the viewer's language with [Translations](Translations.md).
* Raise Base in a plugin as [Releasing](Releasing.md#raise-base-in-a-plugin) describes.
