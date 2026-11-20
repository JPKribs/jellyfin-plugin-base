# Activity Log

Entries in Jellyfin's activity log, where administrators already look.

`ActivityLogger` writes one entry. `ActivitySummary` sums many events into one entry per outcome, so a busy run leaves `12 items synced` and not twelve lines, in the server's display language. `ActivityText` keeps the wording the same across plugins, a short name such as `12 items synced` over one sentence such as `12 from source-a (9), source-b (3)`, with no closing full stop. Use the summary for per-item events.

## ActivityLogger

Writes events to the activity log. Writes are fire and forget, and failures are swallowed and logged at debug level, because an activity entry must never break the flow it documents.

Namespace each entry type under the plugin, for example `MyPlugin.SyncCompleted`, so entries can be attributed. Register one per plugin with `services.AddActivityLogger()`.

```csharp
if (_services.GetService<ActivityLogger>() is { } activity)
{
    _ = activity.LogAndWaitAsync(
        "Sync Needs an Earlier Update First",
        "MyPlugin.SyncAttention",
        ex.Message,
        LogLevel.Error);
}
```

**Gotchas**

* `Log` returns at once and cannot be awaited. `LogAndWaitAsync` completes when the entry is stored or the write failed. Neither throws.
* The name is not `LogAsync` on purpose, since the analyzers would then flag every `Log` call in an async method as blocking.
* The name and overview are trimmed to 512 UTF-16 characters, which can split a surrogate pair at the cut. A null name or overview is stored as an empty string.
* The type is not validated and not trimmed. A `userId` of `Guid.Empty` means no user.
* `Current` is static and the last logger constructed wins. It is null until DI first resolves the logger.

## ActivityOutcome

One kind of summary entry, with a type, how its name reads from the count, an overview builder, and a severity. Define one per result, such as synced, skipped, and retrying, and keep each in a `static readonly` field.

Build it with keys, so the entry is written in the server's display language. The name has one key for a count of 1 and one for any other count, each with `{0}` for the count. The overview builder takes the counts and the language.

```json
{
  "ItemsSyncedOne": "{0} item synced",
  "ItemsSyncedMany": "{0} items synced",
  "ItemsSyncedFrom": "{0} from {1}"
}
```

```csharp
private static readonly ActivityOutcome Synced = new(
    "MyPlugin.ItemsSynced",
    TranslationKeys.ItemsSyncedOne,
    TranslationKeys.ItemsSyncedMany,
    (t, language) => BaseTranslations.Format(TranslationKeys.ItemsSyncedFrom, language, t.Total, ActivityText.CountedList(t.Sources)));
```

An outcome built with an English outcome word, an English overview, and a noun is written in English only.

```csharp
private static readonly ActivityOutcome Synced = new(
    "MyPlugin.ItemsSynced",
    "Synced",
    t => $"{ActivityText.Count(t.Total, "item")} {ActivityText.WasOrWere(t.Total)} synced from {ActivityText.CountedList(t.Sources)}");

private static readonly ActivityOutcome Retrying = new(
    "MyPlugin.ItemsRetrying",
    "Retrying",
    t => $"{ActivityText.Count(t.Total, "item")} from {ActivityText.CountedList(t.Sources)} could not be applied yet and will be retried",
    LogLevel.Warning);
```

**Gotchas**

* Record equality compares the overview delegate by reference, and `ActivitySummary` uses the outcome as a dictionary key. Creating a new outcome for each event splits the counts, so create each once.
* A name that is not a key is used as the text itself, so a plugin may pass text it translated.
* For an English only outcome, the outcome is the end of the entry name, so `Synced` gives `12 Items Synced`. The noun defaults to `Item`.

## ActivityTally

What one summary counted, with the total, the counts by source, and the counts by reason. `ActivitySummary` passes it to the overview delegate of an `ActivityOutcome`.

```csharp
t => $"{ActivityText.Count(t.Total, "item")} skipped, mostly {ActivityText.CountedList(t.Reasons)}"
```

**Gotchas**

* A plugin never creates one. It only reads the tally its delegate receives.
* The source and reason keys are ordinal. `Reasons` counts only events added with a reason.

## ActivitySummary

Sums events into one entry per outcome. Entries are written once no event has arrived for a quiet spell, and at least once per longest spell while events keep coming. Whatever is waiting is written on dispose.

Keep one per plugin as a singleton, and dispose it with its owner. It writes through an `ActivityLogger`. Give it the server's display language, which an outcome built with keys is written in.

```csharp
public sealed class HintActivityLog : IDisposable
{
    private readonly ActivitySummary _summary;

    public HintActivityLog(ActivityLogger activity, IServerConfigurationManager config)
        => _summary = new ActivitySummary(activity, language: () => BaseTranslations.ServerLanguage(config));

    public void Applied(string originName) => _summary.Add(Synced, originName);

    public void Dropped(string originName, string reason) => _summary.Add(NotSynced, originName, reason);

    public void Flush() => _summary.Flush();

    public void Dispose() => _summary.Dispose();
}
```

**Gotchas**

* The quiet spell defaults to 30 seconds and the longest spell to 5 minutes. A clock can be passed for tests.
* The language is read each time a summary is written, so a change to the server's display language reaches the next entry. With no language, an outcome built with keys is written in US English.
* The timer calls `Flush` on a thread-pool thread. An overview delegate that throws there is not caught, so keep the delegate free of exceptions.
* `Flush` takes the waiting counts before it writes them. When an overview delegate throws, the summaries not yet written are lost.
* `Add` does nothing after dispose, and `Flush` is safe at any time. A second `Dispose` does nothing.
* All access is under one lock, and the write itself happens outside it.

## ActivityText

Shared wording for activity entries. `CountedList` and `Sentence` suit any language. `SummaryName`, `Count`, and `WasOrWere` write English only, for an English only outcome.

```csharp
ActivityText.SummaryName(12, "Not Synced");               // "12 Items Not Synced"
ActivityText.Count(3, "playlist");                        // "3 playlists"
ActivityText.WasOrWere(2);                                // "were"
ActivityText.CountedList(new Dictionary<string, int> { ["c"] = 3, ["a"] = 9, ["b"] = 3 }); // "a (9), b (3), c (3)"
ActivityText.Sentence("  paused for now. ");              // "Paused for now"
```

**Gotchas**

* `Count` returns text such as `3 items`, not a number. Zero and negative counts are plural.
* The plural rules are small. A noun ending in `y` after a consonant becomes `ies`, a noun in all capitals gets `S`, and anything else gets `s`. There is no rule for `es` endings, so `class` becomes `classs`. Pick nouns that follow the rules, such as item, file, change, user, playlist, entry, request, and episode.
* `CountedList` lists entries with a count above 0, largest first, ties by key, and returns an empty string when nothing is listed.
* `Sentence` trims the text, removes closing full stops, and capitalizes the first letter.
