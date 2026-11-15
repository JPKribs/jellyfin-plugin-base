# Text and Formatting

Formatting for logs and user text, escaping for generated JavaScript, library item titles, string lists, and content fingerprints.

Three sanitizers cover three sinks. `FormatUtilities.SanitizeForLog` is for logs, `FileNameSanitizer.Sanitize` is for file names, and `StringUtilities.EscapeJsString` is for JavaScript. `StatusPage.Render` encodes HTML itself. Pick the one that matches where the value ends up.

## FormatUtilities

Formatting for log lines and user-facing text.

```csharp
SourceSizeFormatted = FormatUtilities.FormatBytes(i.SourceSize);
_logger.LogInformation("Removed {Count} link(s) to the forgotten server {Key}", links, FormatUtilities.SanitizeForLog(key));
```

Use `SanitizeForLog` for every value that came from a client, a peer, or a remote server.

**Gotchas**

* `FormatBytes` divides by 1024 and prints two decimals with the invariant culture, so 1536 gives `1.50 KB` and the separator is always a period. Values above 1024 TB stay in TB.
* `SanitizeForLog` removes control characters, the line and paragraph separators U+2028 and U+2029, and the bidirectional formatting controls (U+200E, U+200F, U+061C, U+202A to U+202E, U+2066 to U+2069), so a newline cannot forge a log entry and text cannot be reordered, and cuts the text to `maxLength` plus `...` without splitting a surrogate pair. The result is valid XML text.
* Null or empty input returns `[empty]`, but text that is only control characters returns an empty string.
* A surrogate pair that would cross the limit is left out whole, so the kept text can be one character shorter than `maxLength`.
* A negative `maxLength` throws when the text is not empty.

## StringUtilities

Escapes untrusted text for generated JavaScript.

```csharp
var script = "var name = '" + StringUtilities.EscapeJsString(userName) + "';";
```

**Gotchas**

* It is for JavaScript string literals only. It is not an HTML encoder and not a JSON encoder.
* The result is not wrapped in quotes. `<`, `>`, and `&` are written as hex escapes, so `</script>` cannot break out of an inline script.

## StringNormalizationUtility

Puts a list of strings in a canonical form, so two lists compare equal when they hold the same values.

```csharp
["Tags"] = StringNormalizationUtility.NormalizeStringArray(sourcePerson.Tags),
```

**Gotchas**

* It returns null for a null list, an empty list, or a list of only blank entries.
* Otherwise it returns the non-blank entries sorted with `StringComparer.OrdinalIgnoreCase`. Entries are not trimmed and duplicates are kept.

## ItemTitles

Names a library item the way Jellyfin does in its own lists. A bare "Season 1" or "Pilot" names nothing.

```csharp
var episode = new Episode { Name = "Pilot", SeriesName = "The Show", ParentIndexNumber = 1, IndexNumber = 2 };
ItemTitles.TitleOf(episode);     // "The Show S01E02"
ItemTitles.LineOf(episode);      // "The Show S01E02 - Pilot"
ItemTitles.EpisodeCode(episode); // "S01E02"
```

**Gotchas**

* `EpisodeCode` is null when the season or episode number is missing.
* An episode with a series but no code gives `The Show Pilot`, and a season with a series gives `The Show Season 1`.
* `LineOf` adds the episode name only for an episode that has both a code and a series.

## HashUtilities

Short SHA-256 based content fingerprints, and the full lowercase SHA-256 hex of a string. They identify content and are not security primitives.

```csharp
downloadedHash = HashUtilities.ComputeSha256Hash(verifyStream);
var (hash, length) = await HashUtilities.ComputeSha256HashAsync(stream, token).ConfigureAwait(false);
var key = HashUtilities.Sha256Hex(url, 16);
```

**Gotchas**

* `ComputeSha256Hash` returns only the first 32 hex characters, which is 128 bits of the SHA-256. Use `Sha256Hex` for the full hash.
* A stream is hashed from its current position to its end. It is not rewound or disposed.
* The tests pin each overload to known outputs, so a stored fingerprint stays valid across releases.
