# Translations

The plugin's strings in each language, for text the C# writes and for the plugin's pages, and the casing of English text. How a plugin declares Jellyfin strings and adds its own is on [Translations](../../Translations.md).

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

A message a page asked for follows the page's language. `RequestLanguage` reads it, from the `language` query value, then the `X-Jellyfin-Plugin-Language` header the shared bag's `apiRequest` sends, then `Accept-Language`. `UseLanguage` sets the language of Base's own text, such as a refusal from `SsrfGuard`, for the rest of the request.

```csharp
var language = BaseTranslations.RequestLanguage(Request);
using var scope = BaseTranslations.UseLanguage(language);
```

**Gotchas**

* A key no language has gives the key itself, so a missing string shows as its key, never as an exception.
* `Format` fills `{0}`, `{1}` with each value formatted for the language, and keeps any other brace, so a translation never makes it throw.
* `Serve` sets an ETag and `Cache-Control: no-cache`. A page revalidates on every load and gets a 304 when nothing changed, so a plugin update reaches it at once.
* A language code that is not one, such as `../x`, gives US English. Only the languages the plugin has are cached.
* `Languages` lists every language with at least one string, the Jellyfin languages of the declared strings and of Base's own strings included.
* `Serve` answers with `{ "language", "strings", "casing" }`, where language is the most specific language the plugin has strings for, and casing is `TextCase.Exceptions`.
* `UseLanguage` lasts for the async flow it was set on, and its scope puts the earlier language back. A timer or a background task started elsewhere does not see it.

## TextCase

Writes English text in title case or sentence case, with the same rules as `titleCase` and `sentenceCase` on a page. Base's own text is in sentence case, as Jellyfin's is. The rules and the casing list are on [Casing](../../Translations.md#casing).

```csharp
"allow media playback".ToTitleCase(exceptions: new[] { "EPG", "Apple Music" });   // "Allow Media Playback"
"Open The TV Guide".ToSentenceCase();                                             // "Open the TV guide"
"Alles Gute".ToSentenceCase(language: "de");                                      // "Alles Gute"
```

**Gotchas**

* Only English changes. `language` that is `null`, empty, `en`, or `en-*` converts, and any other returns the text as it is.
* `Exceptions` is `DefaultExceptions` with the plugin's `Localization/casing.json`, which the build embeds. Words passed in the call are added on top, and a later spelling of a word wins.
* A word with a capital inside it, or with letters and digits, stays as written, so `iPhone`, `TV`, and `H.264` never change. A lone "I" in the middle of a sentence becomes "i", so add it to the casing list where it matters.
