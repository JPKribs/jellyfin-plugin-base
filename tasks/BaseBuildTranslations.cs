using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using Microsoft.Build.Framework;
using Microsoft.Build.Utilities;

namespace JPKribs.Jellyfin.Base.Tasks;

/// <summary>
/// The MSBuild task behind a plugin's translations. It checks the plugin's Localization files and its JellyfinString
/// items with <see cref="TranslationBuilder"/>, reports each problem against its file and line, and writes one JSON
/// file per language and the TranslationKeys class.
/// </summary>
public sealed class BaseBuildTranslations : Task
{
    private const string HelpLink = "https://jpkribs.github.io/jellyfin-plugin-base/Translations/#diagnostics";

    private static readonly JsonSerializerOptions _json = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    /// <summary>Gets or sets the plugin's translation files, one per language, such as Localization/en-us.json.</summary>
    [Required]
    [SuppressMessage("Performance", "CA1819:Properties should not return arrays", Justification = "MSBuild passes items to a task as an array property.")]
    public ITaskItem[] LocalFiles { get; set; } = Array.Empty<ITaskItem>();

    /// <summary>Gets or sets the Jellyfin strings the plugin declares. An item's Source metadata may name web or server.</summary>
    [SuppressMessage("Performance", "CA1819:Properties should not return arrays", Justification = "MSBuild passes items to a task as an array property.")]
    public ITaskItem[] JellyfinStrings { get; set; } = Array.Empty<ITaskItem>();

    /// <summary>Gets or sets the plugin's keys whose US English may match a Jellyfin string it does not declare.</summary>
    [SuppressMessage("Performance", "CA1819:Properties should not return arrays", Justification = "MSBuild passes items to a task as an array property.")]
    public ITaskItem[] TextMatches { get; set; } = Array.Empty<ITaskItem>();

    /// <summary>Gets or sets the folder of Base's own strings, built into every plugin, or empty for none.</summary>
    public string BaseStringsDirectory { get; set; } = string.Empty;

    /// <summary>Gets or sets the plugin's casing list, such as Localization/casing.json, or empty for none.</summary>
    public string CasingFile { get; set; } = string.Empty;

    /// <summary>Gets or sets the file the merged casing list is written to, or empty to write none.</summary>
    public string CasingOutput { get; set; } = string.Empty;

    /// <summary>Gets or sets the folder that holds Jellyfin's strings and their source.json.</summary>
    [Required]
    public string SnapshotDirectory { get; set; } = string.Empty;

    /// <summary>Gets or sets the folder the language files are written to.</summary>
    [Required]
    public string OutputDirectory { get; set; } = string.Empty;

    /// <summary>Gets or sets the file the TranslationKeys class is written to, or empty to write none.</summary>
    public string KeysFile { get; set; } = string.Empty;

    /// <summary>Gets or sets the project file, which a problem with no file of its own is reported against.</summary>
    public string ProjectFile { get; set; } = string.Empty;

    /// <summary>Gets or sets the namespace of the TranslationKeys class.</summary>
    public string KeysNamespace { get; set; } = "JPKribs.Jellyfin.Base";

    /// <summary>Gets or sets the name of the TranslationKeys class.</summary>
    public string KeysClass { get; set; } = "TranslationKeys";

    /// <inheritdoc />
    public override bool Execute()
    {
        var snapshot = JellyfinSnapshot.Load(SnapshotDirectory);
        if (snapshot is null)
        {
            Report(new TranslationDiagnostic("JPKT015", true, $"Jellyfin's strings are not at {SnapshotDirectory}. Restore the JPKribs.Jellyfin.Base package again, or run scripts/bundle.sh in Base."));
            return false;
        }

        var diagnostics = new List<TranslationDiagnostic>();
        var files = new List<LocalStringFile>();
        foreach (var item in LocalFiles)
        {
            var path = item.GetMetadata("FullPath");
            // The casing list sits beside the language files, and is read on its own.
            if (string.Equals(Path.GetFileName(path), Tasks.CasingFile.FileName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!TranslationBuilder.TryLanguageCode(Path.GetFileNameWithoutExtension(path), out var language))
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT009", true, $"{Path.GetFileName(path)} is not named for a language. Name it by its language code, such as en-us.json or pt-br.json.", path));
                continue;
            }

            try
            {
                files.Add(LocalStringFile.Parse(path, language, File.ReadAllBytes(path), diagnostics));
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                diagnostics.Add(new TranslationDiagnostic("JPKT001", true, "The file could not be read. " + e.Message, path));
            }
        }

        var casing = ReadCasing(diagnostics);
        var shared = ReadShared(diagnostics);
        var declared = JellyfinStrings.Select(i => new DeclaredString(i.ItemSpec, NullIfEmpty(i.GetMetadata("Source")), NullIfEmpty(i.GetMetadata("Case")))).ToList();
        var allowed = TextMatches.Select(i => i.ItemSpec).ToList();
        var result = TranslationBuilder.Build(files, declared, allowed, snapshot, shared, casing);
        diagnostics.AddRange(result.Diagnostics);

        string? keys = null;
        if (!string.IsNullOrEmpty(KeysFile))
        {
            keys = TranslationKeysWriter.Write(result.Keys, KeysNamespace, KeysClass, diagnostics);
        }

        foreach (var diagnostic in diagnostics)
        {
            Report(diagnostic);
        }

        if (diagnostics.Any(d => d.IsError))
        {
            return false;
        }

        WriteLanguages(result.Languages);
        if (keys is not null)
        {
            WriteIfChanged(KeysFile, keys);
        }

        if (!string.IsNullOrEmpty(CasingOutput))
        {
            WriteIfChanged(CasingOutput, JsonSerializer.Serialize(casing, _json));
        }

        return !Log.HasLoggedErrors;
    }

    // Base's defaults, then the plugin's own words.
    private List<string> ReadCasing(List<TranslationDiagnostic> diagnostics)
    {
        var words = new List<string>(TextCase.DefaultExceptions);
        if (string.IsNullOrEmpty(CasingFile) || !File.Exists(CasingFile))
        {
            return words;
        }

        try
        {
            var own = Tasks.CasingFile.Parse(CasingFile, File.ReadAllBytes(CasingFile), diagnostics);
            words.AddRange(own.Where(w => !words.Contains(w, StringComparer.OrdinalIgnoreCase)));
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            diagnostics.Add(new TranslationDiagnostic("JPKT017", true, "The casing list could not be read. " + e.Message, CasingFile));
        }

        return words;
    }

    // Base's own strings: one file per language, and jellyfin.json naming the Jellyfin strings its components use.
    private SharedStrings? ReadShared(List<TranslationDiagnostic> diagnostics)
    {
        if (string.IsNullOrEmpty(BaseStringsDirectory) || !Directory.Exists(BaseStringsDirectory))
        {
            return null;
        }

        var files = new List<LocalStringFile>();
        foreach (var path in Directory.EnumerateFiles(BaseStringsDirectory, "*.json").OrderBy(p => p, StringComparer.Ordinal))
        {
            if (TranslationBuilder.TryLanguageCode(Path.GetFileNameWithoutExtension(path), out var language))
            {
                files.Add(LocalStringFile.Parse(path, language, File.ReadAllBytes(path), diagnostics));
            }
        }

        return new SharedStrings(files, SharedDeclarations.Read(Path.Combine(BaseStringsDirectory, SharedDeclarations.FileName)).Strings);
    }

    private void WriteLanguages(SortedDictionary<string, SortedDictionary<string, string>> languages)
    {
        Directory.CreateDirectory(OutputDirectory);
        foreach (var (language, strings) in languages)
        {
            WriteIfChanged(Path.Combine(OutputDirectory, language + ".json"), JsonSerializer.Serialize(strings, _json));
        }

        foreach (var file in Directory.EnumerateFiles(OutputDirectory, "*.json"))
        {
            if (!languages.ContainsKey(Path.GetFileNameWithoutExtension(file)))
            {
                File.Delete(file);
            }
        }
    }

    // A file is rewritten only when its text changes, so an unchanged build leaves the compiler nothing to redo.
    private static void WriteIfChanged(string path, string text)
    {
        var bytes = new UTF8Encoding(false).GetBytes(text);
        if (File.Exists(path) && File.ReadAllBytes(path).AsSpan().SequenceEqual(bytes))
        {
            return;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        File.WriteAllBytes(path, bytes);
    }

    private void Report(TranslationDiagnostic d)
    {
        d = d.File.Length > 0 || ProjectFile.Length == 0 ? d : d with { File = ProjectFile };
        if (d.IsError)
        {
            Log.LogError("Translations", d.Code, null, HelpLink, d.File, d.Line, d.Column, 0, 0, "{0}", d.Message);
        }
        else
        {
            Log.LogWarning("Translations", d.Code, null, HelpLink, d.File, d.Line, d.Column, 0, 0, "{0}", d.Message);
        }
    }

    private static string? NullIfEmpty(string value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
