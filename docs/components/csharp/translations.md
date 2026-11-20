# Translations

The plugin's strings in each language, for text the C# writes and for the plugin's pages. How a plugin declares Jellyfin strings and adds its own is on [Translations](../../Translations.md).

## BaseTranslations

Reads the strings the build embedded in the plugin: the declared Jellyfin strings and the local strings, one file per language. A string missing from a language falls back to the language's base, such as `pt` for `pt-br`, then to US English. Use the `TranslationKeys` constants the build writes, so a mistyped key fails to compile.

```csharp
var title = BaseTranslations.Get(TranslationKeys.MyRequests, "de");
var quota = BaseTranslations.Format(TranslationKeys.QuotaLeft, "de", used, total);
```

An endpoint serves the strings to the plugin's pages, for `loadTranslations`.

```csharp
[HttpGet("Translations")]
[AllowAnonymous]
public IActionResult Translations([FromQuery] string? language)
    => BaseTranslations.Serve(language, Request, Response);
```

Text the server writes for everyone, such as an activity log entry, uses `ServerLanguage`.

```csharp
var entry = BaseTranslations.Get(TranslationKeys.RequestApproved, BaseTranslations.ServerLanguage(configurationManager));
```

**Gotchas**

* A key no language has gives the key itself, so a missing string shows as its key, never as an exception.
* `Format` fills `{0}`, `{1}` with each value formatted for the language, and keeps any other brace, so a translation never makes it throw.
* `Serve` sets an ETag and `Cache-Control: no-cache`. A page revalidates on every load and gets a 304 when nothing changed, so a plugin update reaches it at once.
* A language code that is not one, such as `../x`, gives US English. Only the languages the plugin has are cached.
* `Languages` lists every language with at least one string, the Jellyfin languages of the declared strings included.
