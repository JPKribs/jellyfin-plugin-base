using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace JPKribs.Jellyfin.Base.Tasks;

/// <summary>
/// The web client's and the server's translations as the package carries them: one minified file per language under
/// web/ and server/, and source.json naming the tags they came from.
/// </summary>
internal sealed class JellyfinSnapshot
{
    /// <summary>The source name of the web client's strings.</summary>
    public const string Web = "web";

    /// <summary>The source name of the server's strings.</summary>
    public const string Server = "server";

    /// <summary>The language every other one falls back to.</summary>
    public const string Fallback = "en-us";

    private readonly Func<string, string, IReadOnlyDictionary<string, string>?> _read;
    private readonly Dictionary<(string Source, string Language), IReadOnlyDictionary<string, string>> _loaded = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="JellyfinSnapshot"/> class.
    /// </summary>
    /// <param name="description">What the snapshot is, such as "web v12.4, server v12.4", for messages.</param>
    /// <param name="languages">The language codes each source has, by source name.</param>
    /// <param name="read">Reads a source's strings in a language, or returns <c>null</c> when it has none.</param>
    public JellyfinSnapshot(string description, IReadOnlyDictionary<string, IReadOnlyList<string>> languages, Func<string, string, IReadOnlyDictionary<string, string>?> read)
    {
        Description = description;
        Languages = languages;
        _read = read;
    }

    /// <summary>Gets what the snapshot is, such as "web v12.4, server v12.4".</summary>
    public string Description { get; }

    /// <summary>Gets the language codes each source has, by source name.</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<string>> Languages { get; }

    /// <summary>
    /// Loads the snapshot from a folder laid out as the package lays it out.
    /// </summary>
    /// <param name="directory">The folder that holds source.json.</param>
    /// <returns>The snapshot, or <c>null</c> when the folder has no readable source.json.</returns>
    public static JellyfinSnapshot? Load(string directory)
    {
        var sourcePath = Path.Combine(directory, "source.json");
        if (!File.Exists(sourcePath))
        {
            return null;
        }

        try
        {
            using var source = JsonDocument.Parse(File.ReadAllBytes(sourcePath));
            var languages = new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal);
            var tags = new List<string>();
            foreach (var name in new[] { Web, Server })
            {
                var element = source.RootElement.GetProperty(name);
                languages[name] = element.GetProperty("languages").EnumerateArray().Select(l => l.GetString() ?? string.Empty).ToList();
                tags.Add(name + " " + element.GetProperty("tag").GetString());
            }

            return new JellyfinSnapshot(string.Join(", ", tags), languages, (name, language) =>
            {
                var file = Path.Combine(directory, name, language + ".json");
                return File.Exists(file) ? JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllBytes(file)) : null;
            });
        }
        catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException or IOException)
        {
            return null;
        }
    }

    /// <summary>
    /// Gets a source's strings in a language.
    /// </summary>
    /// <param name="source">The source name, <see cref="Web"/> or <see cref="Server"/>.</param>
    /// <param name="language">The language code.</param>
    /// <returns>The strings by key, empty when the source has none in that language.</returns>
    public IReadOnlyDictionary<string, string> Strings(string source, string language)
    {
        if (_loaded.TryGetValue((source, language), out var kept))
        {
            return kept;
        }

        var read = Languages.TryGetValue(source, out var codes) && codes.Contains(language, StringComparer.Ordinal)
            ? _read(source, language) ?? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(StringComparer.Ordinal);
        _loaded[(source, language)] = read;
        return read;
    }
}
