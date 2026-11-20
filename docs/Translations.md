# Translations

How a plugin shows its text in the viewer's language. A plugin uses Jellyfin's own strings wherever Jellyfin has the words, and adds its own strings only for the rest. Base checks both when the plugin builds and builds them into the plugin, so a plugin stays one DLL.

## How It Works

A plugin's text comes from two places.

| Source | Where it lives | Who translates it |
| :--- | :--- | :--- |
| Jellyfin strings | The web client's and the server's translations, which the package carries | Jellyfin's translators, in every language Jellyfin has |
| Local strings | The plugin's `Localization` folder, one file per language | The plugin |

Each build of the plugin does four things.

1. Reads the `JellyfinString` items in the project file, and the files in `Localization`.
2. Checks them. A string said twice, or a key Jellyfin already has, fails the build with the file and line. See [Diagnostics](#diagnostics).
3. Embeds one file per language, with the declared Jellyfin strings and the local strings together.
4. Compiles the `TranslationKeys` class, with one constant per key, so a mistyped key fails to compile.

At runtime, `BaseTranslations` reads the strings in C#, and `loadTranslations` reads them on a page. A string missing from a language falls back to the language's base, such as `pt` for `pt-br`, then to US English.

Nothing happens in a plugin with no `Localization` files and no `JellyfinString` items.

## Use a Jellyfin String

1. Find the key in Jellyfin's US English strings. The web client's are in [`src/strings/en-us.json`](https://github.com/jellyfin/jellyfin-web/blob/v12.4/src/strings/en-us.json), and the server's are in [`Emby.Server.Implementations/Localization/Core/en-US.json`](https://github.com/jellyfin/jellyfin/blob/v12.4/Emby.Server.Implementations/Localization/Core/en-US.json).
2. Declare it in the plugin's project file.

    ```xml
    <ItemGroup>
      <JellyfinString Include="Favorites;Movies;HeaderContinueWatching" />
    </ItemGroup>
    ```

3. Use it like any other key, `TranslationKeys.Favorites` in C# and `'Favorites'` on a page.

The plugin gets the string in every language Jellyfin has it. A key both sources have is taken from the web client. Add `Source="server"` to take the server's instead.

```xml
<JellyfinString Include="Favorites" Source="server" />
```

## Add a Local String

Add the key and its US English to `Localization/en-us.json`, beside the project file.

```json
{
  "MyRequests": "My Requests",
  "QuotaLeft": "{0} of {1} left"
}
```

US English holds every local key. A local string follows three rules, and the build enforces each.

* Its key is not a Jellyfin key.
* Its English is not the English of a Jellyfin string the plugin declares. Use the declared string instead.
* Its English is not the English of another local string. One string is said once, under one key.

When a local string's English matches a Jellyfin string the plugin has not declared, the build warns with `JPKT006` and names the Jellyfin key. Declare that key and use it. When the meaning differs, such as a TV network and a storage network, keep the local string and mark it.

```xml
<ItemGroup>
  <JellyfinTextMatch Include="Network" />
</ItemGroup>
```

## Add a Language

Add a file named for the language code, such as `Localization/de.json` or `Localization/pt-br.json`. A name with an underscore, such as `pt_BR.json`, means the same language.

```json
{
  "MyRequests": "Meine Anfragen",
  "QuotaLeft": "{0} von {1} übrig"
}
```

* A language file holds only keys that `en-us.json` has.
* A translation keeps the placeholders of its English. The build warns with `JPKT011` when they differ.
* A key a language leaves out, or leaves empty, falls back to the language's base and then to US English.
* The Jellyfin strings come in every language Jellyfin has, with no file needed.

## Show the Strings on a Page

Add an endpoint that answers with `BaseTranslations.Serve`. The strings are not secret, and a standalone page has no signed in user yet, so it allows anonymous requests.

```csharp
[HttpGet("Translations")]
[AllowAnonymous]
public IActionResult Translations([FromQuery] string? language)
    => BaseTranslations.Serve(language, Request, Response);
```

Load them on the page with `loadTranslations`. It asks for the viewer's language, their display setting in the web client or else the browser's, and loads each language once.

```js
import { loadTranslations } from './configurationpage?name=myplugin_jpkribs_shared.js';

loadTranslations('MyPlugin/Translations').then(function (t) {
    t.apply(view);
    view.querySelector('#quota').textContent = t.format('QuotaLeft', 3, 5);
});
```

Mark static markup with its key, and `apply` translates it. Markup whose key has no string keeps its own text.

```html
<h2 data-str="MyRequests">My Requests</h2>
<button data-str-title="Favorites" data-str-label="Favorites"></button>
<input data-str-placeholder="Search">
```

See [Translations](components/web/translations.md) in the web components for every helper.

## Use the Strings in C#

```csharp
var title = BaseTranslations.Get(TranslationKeys.MyRequests, language);
var quota = BaseTranslations.Format(TranslationKeys.QuotaLeft, language, used, total);
```

Text the server writes for everyone, such as an activity log entry, uses the server's display language.

```csharp
var language = BaseTranslations.ServerLanguage(configurationManager);
```

See [Translations](components/csharp/translations.md) in the C# components.

## Settings

Each setting is an MSBuild property in the plugin's project file. Every one has a default that suits a plugin with a `Localization` folder.

| Property | Default | What it does |
| :--- | :--- | :--- |
| `BaseLocalizationDirectory` | `Localization\` | The folder of local string files |
| `BaseGenerateTranslationKeys` | `true` | Compiles the `TranslationKeys` class |
| `BaseTranslationKeysNamespace` | `JPKribs.Jellyfin.Base` | The namespace of `TranslationKeys` |
| `BaseTranslationKeysClass` | `TranslationKeys` | The name of the class |
| `BaseTranslations` | `true` | `false` turns the translations build off |

Add `BaseLocalString` items to name the local files yourself, in place of the folder.

## Diagnostics

Every problem is reported against its file and line, as the compiler reports its own. Errors fail the build. Warnings do not fail it, even with `TreatWarningsAsErrors`, and `NoWarn` can silence one by its code.

| Code | Level | What is wrong | Fix |
| :--- | :--- | :--- | :--- |
| `JPKT001` | Error | A local file is not a JSON object of strings | Correct the JSON |
| `JPKT002` | Error | A key appears twice in one local file | Keep one entry |
| `JPKT003` | Error | Two local keys have the same US English | Use one key for the string |
| `JPKT004` | Error | A local key is already a Jellyfin key | Rename it, or remove it and declare the Jellyfin string |
| `JPKT005` | Error | A local string's English is a declared Jellyfin string's English | Use the Jellyfin string and remove the local one |
| `JPKT006` | Warning | A local string's English matches a Jellyfin string the plugin has not declared | Declare the Jellyfin string, or add `JellyfinTextMatch` when the meaning differs |
| `JPKT007` | Error | A `JellyfinString` is not a Jellyfin key, or its `Source` is not `web` or `server` | Check the key and its case |
| `JPKT008` | Error | A language file has a key `en-us.json` does not | Add it to `en-us.json` first, or remove it |
| `JPKT009` | Error | A file is not named for a language, or two files are one language | Name it by its code, one file per language |
| `JPKT010` | Error | There are local files but no `en-us.json` | Add `en-us.json` with every key |
| `JPKT011` | Warning | A translation's placeholders differ from its English | Use the same `{0}`, `{1}` |
| `JPKT012` | Error | A US English string is empty | Give it text |
| `JPKT013` | Warning | A `JellyfinTextMatch` is not needed | Remove it |
| `JPKT014` | Error | Two keys make the same `TranslationKeys` name, such as `A.B` and `A_B` | Rename one |
| `JPKT015` | Error | The package's Jellyfin strings are missing | Restore the package again |
| `JPKT016` | Error | The build runs in an MSBuild that cannot run the task | Build with `dotnet build`, or Visual Studio 2026 or later |

## Which Jellyfin Strings

The package carries the strings of one Jellyfin release, the one its version starts with. Base `12.4.0` carries Jellyfin 12.4's strings, and a plugin built with it shows Jellyfin 12.4's wording, whatever server it runs on. A string Jellyfin translates later reaches a plugin when Base takes it from a later Jellyfin release and the plugin moves to that Base.

## Gotchas

* The strings are fixed when the plugin builds. A plugin built against one Base keeps its wording until it is built against another.
* `TranslationKeys` is internal to the plugin, and is written to `obj/`. Build once for the editor to see a new key.
* Only the Jellyfin strings a plugin declares are built in, so the plugin carries a few kilobytes per language, not all of Jellyfin's.
* A web client language that Jellyfin has not translated a declared string into falls back to US English for that string, as the web client does.
