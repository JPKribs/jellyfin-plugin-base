# Text and Formatting

Formatting for logs and user text, escaping for generated JavaScript, library item titles, string lists, and content fingerprints.

Three sanitizers cover three sinks. `FormatUtilities.SanitizeForLog` is for logs, `FileNameSanitizer.Sanitize` is for file names, and `StringUtilities.EscapeJsString` is for JavaScript. `StatusPage.Render` encodes HTML itself. Pick the one that matches where the value ends up.

## FormatUtilities

Formatting for log lines and user-facing text.

```csharp
SourceSizeFormatted = FormatUtilities.FormatBytes(i.SourceSize);
_logger.LogInformation("Removed {Count} links to the forgotten server {Key}", links, FormatUtilities.SanitizeForLog(key));
```

Use `SanitizeForLog` for every value that came from a client, a peer, or a remote server.

**Gotchas**

* `FormatBytes` divides by 1024 and prints two decimals with the invariant culture, so 1536 gives `1.50 KB` and the separator is always a period. Values above 1024 TB stay in TB, and a negative count stays in bytes.
* `SanitizeForLog` removes control characters, U+FFFE and U+FFFF, the line and paragraph separators U+2028 and U+2029, and the bidirectional formatting controls. Those are U+200E, U+200F, U+061C, U+202A to U+202E, and U+2066 to U+2069. A newline cannot forge a log entry, and text cannot be reordered.
* A lone surrogate becomes U+FFFD, so the result is valid XML text.
* Text longer than `maxLength`, 200 by default, is cut and gets `...` added, so the result can be three characters longer than `maxLength`.
* Null or empty input returns `[empty]`, but text that is only control characters returns an empty string.
* A surrogate pair that would cross the limit is left out whole, so the kept text can be one character shorter than `maxLength`.
* A negative `maxLength` throws when the text is not empty.

## UtcTime

One rule for times a plugin stores or compares. A time with no zone is UTC, a local time is converted, and a stored time is UTC round trip text ending in Z.

```csharp
row.UpdatedAt = UtcTime.Format(DateTime.UtcNow);
if (UtcTime.TryParse(row.UpdatedAt, out var updated) && updated < cutoff) { }
```

**Gotchas**

* Stored text ending in Z sorts in time order as text, so a database can compare and order it without parsing.
* `AsUtc` reads a time with no zone as UTC, never as the server's local time.
* `TryParse` reads text with a Z, with no zone, or with an offset, and always returns a UTC time. Text that is not a time gives `false` and `DateTime.MinValue`, and `Parse` throws `FormatException`.

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

* `ComputeSha256Hash` and `ComputeSha256HashAsync` return only the first 32 hex characters, which is 128 bits of the SHA-256. Use `Sha256Hex` for the full hash, or pass it a `length` from 1 to 64 for a shorter one.
* A stream is hashed from its current position to its end. It is not rewound or disposed.
* The tests pin each overload to known outputs, so a stored fingerprint stays valid across releases.
