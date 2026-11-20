using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;

namespace JPKribs.Jellyfin.Base.Tasks;

/// <summary>
/// Checks a plugin's own strings against each other and against Jellyfin's, and builds the strings the plugin ships:
/// the Jellyfin strings it declares, in every language Jellyfin has them, with its own strings beside them.
/// </summary>
internal static partial class TranslationBuilder
{
    private const int MaxListed = 3;

    /// <summary>
    /// Reads a language code from a translation file's name, the way the web client compares codes.
    /// </summary>
    /// <param name="fileName">The file name without its extension, such as pt_BR.</param>
    /// <param name="code">The code, lower case with a hyphen, such as pt-br.</param>
    /// <returns><c>true</c> when the name is a language code.</returns>
    public static bool TryLanguageCode(string fileName, out string code)
    {
        code = (fileName ?? string.Empty).Replace('_', '-').ToLowerInvariant();
        return LanguageCode().IsMatch(code);
    }

    /// <summary>
    /// Checks the strings and builds what the plugin ships.
    /// </summary>
    /// <param name="files">The plugin's translation files, already read.</param>
    /// <param name="declared">The Jellyfin strings the plugin declares.</param>
    /// <param name="allowedMatches">The plugin's keys whose English may match a Jellyfin string it does not declare.</param>
    /// <param name="snapshot">Jellyfin's strings.</param>
    /// <param name="shared">Base's own strings, built into every plugin beside its own, or <c>null</c> for none.</param>
    /// <param name="casing">The words a Case conversion keeps as written, added to the defaults, or <c>null</c> for the defaults alone.</param>
    /// <returns>The problems found, the strings by language, and every key with its English.</returns>
    public static TranslationResult Build(IReadOnlyList<LocalStringFile> files, IReadOnlyList<DeclaredString> declared, IReadOnlyCollection<string> allowedMatches, JellyfinSnapshot snapshot, SharedStrings? shared = null, IReadOnlyList<string>? casing = null)
    {
        ArgumentNullException.ThrowIfNull(files);
        ArgumentNullException.ThrowIfNull(declared);
        ArgumentNullException.ThrowIfNull(allowedMatches);
        ArgumentNullException.ThrowIfNull(snapshot);

        var result = new TranslationResult();
        var local = ByLanguage(files, result.Diagnostics);
        var jellyfin = JellyfinEnglish(snapshot);
        var own = Declare(declared, jellyfin, snapshot, result.Diagnostics);

        // Base's own declarations join the plugin's, so a key both declare is built in once, from the plugin's source.
        // A plugin's declaration with no Case takes Base's, so Base's components read the same text in every plugin.
        var chosen = new Dictionary<string, Chosen>(own, StringComparer.Ordinal);
        if (shared is not null)
        {
            foreach (var (key, value) in Declare(shared.Declared, jellyfin, snapshot, result.Diagnostics))
            {
                if (!chosen.TryAdd(key, value) && chosen[key].Case is null && value.Case is not null)
                {
                    chosen[key] = own[key] = chosen[key] with { Case = value.Case };
                }
            }
        }

        local.TryGetValue(JellyfinSnapshot.Fallback, out var english);
        if (english is null && local.Count > 0)
        {
            var first = local.Values.First();
            result.Diagnostics.Add(new TranslationDiagnostic("JPKT010", true, $"There is no {JellyfinSnapshot.Fallback}.json beside {FileName(first.File.Path)}. US English holds every key, and the other languages translate it.", first.File.Path));
        }

        var englishKeys = english is null ? new Dictionary<string, LocalStringEntry>(StringComparer.Ordinal) : english.Strings;
        if (english is not null)
        {
            CheckEnglish(english, jellyfin, own, allowedMatches, false, result.Diagnostics);
        }

        // With no US English, JPKT010 says so once, rather than JPKT008 for every key of every language.
        foreach (var file in local.Values.Where(f => english is not null && !ReferenceEquals(f, english)))
        {
            CheckTranslation(file, englishKeys, result.Diagnostics);
        }

        var shown = shared is null ? new Dictionary<string, KeptFile>(StringComparer.Ordinal) : ByLanguage(shared.Files, result.Diagnostics);
        Compose(local, shown, chosen, own, snapshot, casing, result);
        return result;
    }

    // Each language's file, its repeated keys reported, and a second file for one language reported.
    private static Dictionary<string, KeptFile> ByLanguage(IReadOnlyList<LocalStringFile> files, List<TranslationDiagnostic> diagnostics)
    {
        var byLanguage = new Dictionary<string, KeptFile>(StringComparer.Ordinal);
        foreach (var file in files)
        {
            if (byLanguage.TryGetValue(file.Language, out var other))
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT009", true, $"{FileName(file.Path)} and {FileName(other.File.Path)} are both {file.Language}. Keep one file per language.", file.Path));
                continue;
            }

            var strings = new Dictionary<string, LocalStringEntry>(StringComparer.Ordinal);
            foreach (var entry in file.Entries)
            {
                if (strings.TryGetValue(entry.Key, out var first))
                {
                    diagnostics.Add(new TranslationDiagnostic("JPKT002", true, $"\"{entry.Key}\" is already on line {first.Line}. Keep one entry per key.", file.Path, entry.Line, entry.Column));
                    continue;
                }

                strings[entry.Key] = entry;
            }

            byLanguage[file.Language] = new KeptFile(file, strings);
        }

        return byLanguage;
    }

    // Every Jellyfin key in US English, with the sources that have it, the web client's first.
    private static Dictionary<string, List<(string Source, string Text)>> JellyfinEnglish(JellyfinSnapshot snapshot)
    {
        var keys = new Dictionary<string, List<(string Source, string Text)>>(StringComparer.Ordinal);
        foreach (var source in new[] { JellyfinSnapshot.Web, JellyfinSnapshot.Server })
        {
            foreach (var (key, text) in snapshot.Strings(source, JellyfinSnapshot.Fallback))
            {
                if (!keys.TryGetValue(key, out var list))
                {
                    keys[key] = list = new List<(string, string)>();
                }

                list.Add((source, text));
            }
        }

        return keys;
    }

    // The source each declared key is taken from: the one it names, else the web client, else the server.
    private static Dictionary<string, Chosen> Declare(IReadOnlyList<DeclaredString> declared, Dictionary<string, List<(string Source, string Text)>> jellyfin, JellyfinSnapshot snapshot, List<TranslationDiagnostic> diagnostics)
    {
        var chosen = new Dictionary<string, Chosen>(StringComparer.Ordinal);
        foreach (var item in declared)
        {
            if (chosen.ContainsKey(item.Key))
            {
                continue;
            }

            var source = string.IsNullOrEmpty(item.Source) ? null : item.Source.ToLowerInvariant();
            if (source is not null and not JellyfinSnapshot.Web and not JellyfinSnapshot.Server)
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT007", true, $"The JellyfinString \"{item.Key}\" has Source=\"{item.Source}\". Use web, server, or leave it out."));
                continue;
            }

            var casing = string.IsNullOrEmpty(item.Case) ? null : item.Case.ToLowerInvariant();
            if (casing is not null and not "title" and not "sentence")
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT020", true, $"The JellyfinString \"{item.Key}\" has Case=\"{item.Case}\". Use title, sentence, or leave it out."));
                continue;
            }

            if (!jellyfin.TryGetValue(item.Key, out var found) || (source is not null && !found.Any(f => f.Source == source)))
            {
                var near = jellyfin.Keys.Where(k => string.Equals(k, item.Key, StringComparison.OrdinalIgnoreCase)).FirstOrDefault();
                var where = source is null ? "Jellyfin" : "Jellyfin's " + source + " strings";
                var hint = near is null ? " Check the key in Jellyfin's en-us.json, or add the string to Localization/en-us.json." : $" Did you mean \"{near}\"?";
                diagnostics.Add(new TranslationDiagnostic("JPKT007", true, $"The JellyfinString \"{item.Key}\" is not in {where} ({snapshot.Description}).{hint}"));
                continue;
            }

            var picked = source is null ? found[0] : found.First(f => f.Source == source);
            chosen[item.Key] = new Chosen(picked.Source, picked.Text, casing);
        }

        return chosen;
    }

    // US English: no Jellyfin key, no text a declared string already says, no text said twice, and a warning for
    // text Jellyfin says under a key the plugin has not declared.
    private static void CheckEnglish(KeptFile english, Dictionary<string, List<(string Source, string Text)>> jellyfin, Dictionary<string, Chosen> chosen, IReadOnlyCollection<string> allowedMatches, bool isShared, List<TranslationDiagnostic> diagnostics)
    {
        var path = english.File.Path;
        var allowed = new HashSet<string>(allowedMatches, StringComparer.Ordinal);
        var declaredByText = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        foreach (var (key, value) in chosen)
        {
            Add(declaredByText, value.Text, key);
        }

        var jellyfinByText = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        foreach (var (key, values) in jellyfin)
        {
            foreach (var text in values.Select(v => v.Text).Distinct(StringComparer.Ordinal))
            {
                Add(jellyfinByText, text, key);
            }
        }

        var seenText = new Dictionary<string, LocalStringEntry>(StringComparer.Ordinal);
        var matched = new HashSet<string>(StringComparer.Ordinal);
        foreach (var entry in english.Strings.Values.OrderBy(e => e.Line))
        {
            if (entry.Text.Length == 0)
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT012", true, $"\"{entry.Key}\" has no text. US English is the text every language falls back to.", path, entry.Line, entry.Column));
                continue;
            }

            if (entry.Key.StartsWith(SharedStrings.Prefix, StringComparison.Ordinal) != isShared)
            {
                if (isShared)
                {
                    diagnostics.Add(new TranslationDiagnostic("JPKT021", true, $"\"{entry.Key}\" does not start with {SharedStrings.Prefix}, which every key of Base's own strings does.", path, entry.Line, entry.Column));
                    continue;
                }

                diagnostics.Add(new TranslationDiagnostic("JPKT021", true, $"\"{entry.Key}\" starts with {SharedStrings.Prefix}, which only Base's own strings use. Rename it.", path, entry.Line, entry.Column));
                continue;
            }

            if (jellyfin.TryGetValue(entry.Key, out var same))
            {
                var theirs = same[0];
                var fix = theirs.Text == entry.Text
                    ? $"Remove it here and declare <JellyfinString Include=\"{entry.Key}\" />."
                    : "Rename it, or remove it here and declare the Jellyfin string when its text fits.";
                diagnostics.Add(new TranslationDiagnostic("JPKT004", true, $"\"{entry.Key}\" is already a Jellyfin string ({theirs.Source}: \"{theirs.Text}\"). {fix}", path, entry.Line, entry.Column));
                continue;
            }

            if (seenText.TryGetValue(entry.Text, out var earlier))
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT003", true, $"\"{entry.Key}\" says \"{entry.Text}\", the same as \"{earlier.Key}\" on line {earlier.Line}. Use one key for one string.", path, entry.Line, entry.Column));
                continue;
            }

            seenText[entry.Text] = entry;

            if (declaredByText.TryGetValue(entry.Text, out var declaredKeys))
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT005", true, $"\"{entry.Key}\" says \"{entry.Text}\", the same as the declared Jellyfin string {List(declaredKeys)}. Use the Jellyfin string and remove this one.", path, entry.Line, entry.Column));
                continue;
            }

            if (jellyfinByText.TryGetValue(entry.Text, out var jellyfinKeys))
            {
                matched.Add(entry.Key);
                if (!allowed.Contains(entry.Key))
                {
                    diagnostics.Add(new TranslationDiagnostic("JPKT006", false, $"\"{entry.Key}\" says \"{entry.Text}\", the same as the Jellyfin string {List(jellyfinKeys)}. Declare it as a JellyfinString and use it, or add <JellyfinTextMatch Include=\"{entry.Key}\" /> when the meaning differs.", path, entry.Line, entry.Column));
                }
            }
        }

        foreach (var key in allowed.Where(k => !matched.Contains(k)).OrderBy(k => k, StringComparer.Ordinal))
        {
            var why = english.Strings.ContainsKey(key) ? "its text matches no Jellyfin string" : "it is not a key in " + FileName(path);
            diagnostics.Add(new TranslationDiagnostic("JPKT013", false, $"The JellyfinTextMatch \"{key}\" is not needed, since {why}. Remove it.", path));
        }
    }

    /// <summary>
    /// Checks Base's own strings by the rules a plugin's strings follow, and that every key starts with
    /// <see cref="SharedStrings.Prefix"/>.
    /// </summary>
    /// <param name="shared">Base's own strings.</param>
    /// <param name="allowedMatches">Base's keys whose English may match a Jellyfin string it does not declare.</param>
    /// <param name="snapshot">Jellyfin's strings.</param>
    /// <returns>The problems found.</returns>
    public static IReadOnlyList<TranslationDiagnostic> CheckShared(SharedStrings shared, IReadOnlyCollection<string> allowedMatches, JellyfinSnapshot snapshot)
    {
        ArgumentNullException.ThrowIfNull(shared);
        ArgumentNullException.ThrowIfNull(allowedMatches);
        ArgumentNullException.ThrowIfNull(snapshot);

        var diagnostics = new List<TranslationDiagnostic>();
        var files = ByLanguage(shared.Files, diagnostics);
        var jellyfin = JellyfinEnglish(snapshot);
        var declared = Declare(shared.Declared, jellyfin, snapshot, diagnostics);
        if (!files.TryGetValue(JellyfinSnapshot.Fallback, out var english))
        {
            diagnostics.Add(new TranslationDiagnostic("JPKT010", true, $"Base's own strings have no {JellyfinSnapshot.Fallback}.json."));
            return diagnostics;
        }

        CheckEnglish(english, jellyfin, declared, allowedMatches, true, diagnostics);
        foreach (var file in files.Values.Where(f => !ReferenceEquals(f, english)))
        {
            CheckTranslation(file, english.Strings, diagnostics);
        }

        return diagnostics;
    }

    // Another language: only keys US English has, with the same placeholders.
    private static void CheckTranslation(KeptFile file, Dictionary<string, LocalStringEntry> english, List<TranslationDiagnostic> diagnostics)
    {
        foreach (var entry in file.Strings.Values.OrderBy(e => e.Line))
        {
            if (!english.TryGetValue(entry.Key, out var source))
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT008", true, $"\"{entry.Key}\" is not in {JellyfinSnapshot.Fallback}.json. Add it there first, or remove it here.", file.File.Path, entry.Line, entry.Column));
                continue;
            }

            if (entry.Text.Length > 0 && !Placeholders(entry.Text).SetEquals(Placeholders(source.Text)))
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT011", false, $"\"{entry.Key}\" has the placeholders {PlaceholderList(entry.Text)}, and US English has {PlaceholderList(source.Text)}.", file.File.Path, entry.Line, entry.Column));
            }
        }
    }

    // Every language that has a string: the declared ones from their source, in title or sentence case in English when
    // the declaration says, then Base's own, then the plugin's own. A language missing a string falls back at runtime,
    // so nothing is copied from US English.
    private static void Compose(Dictionary<string, KeptFile> local, Dictionary<string, KeptFile> shared, Dictionary<string, Chosen> chosen, Dictionary<string, Chosen> own, JellyfinSnapshot snapshot, IReadOnlyList<string>? casing, TranslationResult result)
    {
        var languages = new SortedSet<string>(local.Keys, StringComparer.Ordinal);
        languages.UnionWith(shared.Keys);
        foreach (var source in chosen.Values.Select(c => c.Source).Distinct(StringComparer.Ordinal))
        {
            languages.UnionWith(snapshot.Languages[source]);
        }

        foreach (var language in languages)
        {
            var strings = new SortedDictionary<string, string>(StringComparer.Ordinal);
            foreach (var (key, value) in chosen)
            {
                if (snapshot.Strings(value.Source, language).TryGetValue(key, out var text) && text.Length > 0)
                {
                    strings[key] = Cased(text, value.Case, language, casing);
                }
            }

            if (shared.TryGetValue(language, out var sharedFile))
            {
                foreach (var entry in sharedFile.Strings.Values.Where(e => e.Text.Length > 0))
                {
                    strings[entry.Key] = entry.Text;
                }
            }

            if (local.TryGetValue(language, out var file))
            {
                foreach (var entry in file.Strings.Values.Where(e => e.Text.Length > 0))
                {
                    strings[entry.Key] = entry.Text;
                }
            }

            if (strings.Count > 0)
            {
                result.Languages[language] = strings;
            }
        }

        foreach (var (key, value) in own)
        {
            result.Keys[key] = Cased(value.Text, chosen[key].Case, JellyfinSnapshot.Fallback, casing);
        }

        if (local.TryGetValue(JellyfinSnapshot.Fallback, out var english))
        {
            foreach (var entry in english.Strings.Values)
            {
                result.Keys.TryAdd(entry.Key, entry.Text);
            }
        }
    }

    // A declared string's text in title or sentence case, in English only, keeping the casing list's words as written.
    private static string Cased(string text, string? casing, string language, IReadOnlyList<string>? words)
    {
        if (casing is null || !TextCase.IsEnglish(language))
        {
            return text;
        }

        return casing == "title" ? text.ToTitleCase(words, language) : text.ToSentenceCase(words, language);
    }

    private static void Add(Dictionary<string, List<string>> index, string text, string key)
    {
        if (!index.TryGetValue(text, out var keys))
        {
            index[text] = keys = new List<string>();
        }

        keys.Add(key);
    }

    private static string List(List<string> keys)
    {
        var sorted = keys.OrderBy(k => k, StringComparer.Ordinal).ToList();
        var shown = string.Join(", ", sorted.Take(MaxListed).Select(k => "\"" + k + "\""));
        return sorted.Count > MaxListed ? shown + string.Format(CultureInfo.InvariantCulture, " and {0} more", sorted.Count - MaxListed) : shown;
    }

    private static HashSet<string> Placeholders(string text)
        => new(Placeholder().Matches(text).Select(m => m.Value), StringComparer.Ordinal);

    private static string PlaceholderList(string text)
    {
        var found = Placeholders(text).OrderBy(p => p, StringComparer.Ordinal).ToList();
        return found.Count == 0 ? "none" : string.Join(" ", found);
    }

    private static string FileName(string path) => System.IO.Path.GetFileName(path);

    [GeneratedRegex(@"^[a-z]{2,3}(-[a-z0-9]{2,8})*$")]
    private static partial Regex LanguageCode();

    [GeneratedRegex(@"\{\d+\}")]
    private static partial Regex Placeholder();

    private sealed record KeptFile(LocalStringFile File, Dictionary<string, LocalStringEntry> Strings);

    private sealed record Chosen(string Source, string Text, string? Case);
}

/// <summary>
/// A Jellyfin string a plugin uses, declared in its project file as a JellyfinString item.
/// </summary>
/// <param name="Key">The Jellyfin key, such as Favorites.</param>
/// <param name="Source">The source to take it from, web or server, or <c>null</c> for the web client's, else the server's.</param>
/// <param name="Case">title or sentence to convert its English text, or <c>null</c> to keep Jellyfin's.</param>
internal sealed record DeclaredString(string Key, string? Source = null, string? Case = null);

/// <summary>
/// Base's own strings, built into every plugin: its local strings, whose keys start with <see cref="Prefix"/>, and the
/// Jellyfin strings its components use.
/// </summary>
/// <param name="Files">Base's own translation files, one per language.</param>
/// <param name="Declared">The Jellyfin strings Base declares.</param>
internal sealed record SharedStrings(IReadOnlyList<LocalStringFile> Files, IReadOnlyList<DeclaredString> Declared)
{
    /// <summary>The start of every key of Base's own strings, which a plugin's key cannot use.</summary>
    public const string Prefix = "Base.";
}

/// <summary>
/// What <see cref="TranslationBuilder.Build"/> found and built.
/// </summary>
internal sealed class TranslationResult
{
    /// <summary>Gets the problems found, errors and warnings.</summary>
    public List<TranslationDiagnostic> Diagnostics { get; } = new();

    /// <summary>Gets the strings the plugin ships, by language code and then by key.</summary>
    public SortedDictionary<string, SortedDictionary<string, string>> Languages { get; } = new(StringComparer.Ordinal);

    /// <summary>Gets every key the plugin can use, with its US English text.</summary>
    public SortedDictionary<string, string> Keys { get; } = new(StringComparer.Ordinal);

    /// <summary>Gets a value indicating whether any problem fails the build.</summary>
    public bool HasErrors => Diagnostics.Any(d => d.IsError);
}
