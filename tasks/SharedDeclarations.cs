using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace JPKribs.Jellyfin.Base.Tasks;

/// <summary>
/// The Jellyfin strings Base's own components use, from jellyfin.json in Base's strings folder: each key with an
/// optional source and case, and the keys of Base's own strings whose English may match a Jellyfin string.
/// </summary>
/// <param name="Strings">The Jellyfin strings Base declares.</param>
/// <param name="TextMatches">Base's keys whose English may match a Jellyfin string it does not declare.</param>
internal sealed record SharedDeclarations(IReadOnlyList<DeclaredString> Strings, IReadOnlyList<string> TextMatches)
{
    /// <summary>The file's name in Base's strings folder.</summary>
    public const string FileName = "jellyfin.json";

    /// <summary>
    /// Reads the declarations.
    /// </summary>
    /// <param name="path">The path of jellyfin.json.</param>
    /// <returns>The declarations, or none when the file is missing or not readable.</returns>
    public static SharedDeclarations Read(string path)
    {
        var none = new SharedDeclarations(Array.Empty<DeclaredString>(), Array.Empty<string>());
        if (!File.Exists(path))
        {
            return none;
        }

        try
        {
            using var document = JsonDocument.Parse(File.ReadAllBytes(path));
            var root = document.RootElement;
            var strings = root.TryGetProperty("strings", out var list)
                ? list.EnumerateArray().Select(e => new DeclaredString(Text(e, "key") ?? string.Empty, Text(e, "source"), Text(e, "case"))).Where(d => d.Key.Length > 0).ToList()
                : new List<DeclaredString>();
            var matches = root.TryGetProperty("textMatches", out var keys)
                ? keys.EnumerateArray().Select(k => k.GetString() ?? string.Empty).Where(k => k.Length > 0).ToList()
                : new List<string>();
            return new SharedDeclarations(strings, matches);
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException or IOException)
        {
            return none;
        }
    }

    private static string? Text(JsonElement element, string name)
        => element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}
