using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;

namespace JPKribs.Jellyfin.Base.Tasks;

/// <summary>
/// One of a plugin's own translation files, such as Localization/en-us.json, read entry by entry so a repeated key
/// and the line of each entry are kept.
/// </summary>
internal sealed class LocalStringFile
{
    private LocalStringFile(string path, string language, IReadOnlyList<LocalStringEntry> entries)
    {
        Path = path;
        Language = language;
        Entries = entries;
    }

    /// <summary>Gets the file's path, as the project names it.</summary>
    public string Path { get; }

    /// <summary>Gets the file's language code, lower case with a hyphen, such as pt-br.</summary>
    public string Language { get; }

    /// <summary>Gets every entry in file order, a repeated key included.</summary>
    public IReadOnlyList<LocalStringEntry> Entries { get; }

    /// <summary>
    /// Reads a translation file. A file that is not a JSON object of strings gives a JPKT001 error and no entries.
    /// </summary>
    /// <param name="path">The file's path, as the project names it.</param>
    /// <param name="language">The file's language code.</param>
    /// <param name="bytes">The file's content.</param>
    /// <param name="diagnostics">Receives the problems found.</param>
    /// <returns>The file.</returns>
    public static LocalStringFile Parse(string path, string language, byte[] bytes, ICollection<TranslationDiagnostic> diagnostics)
    {
        ArgumentNullException.ThrowIfNull(bytes);
        ArgumentNullException.ThrowIfNull(diagnostics);

        var entries = new List<LocalStringEntry>();
        var text = bytes.AsSpan();
        var bom = Encoding.UTF8.Preamble;
        var offset = text.StartsWith(bom) ? bom.Length : 0;
        var reader = new Utf8JsonReader(text[offset..], new JsonReaderOptions { CommentHandling = JsonCommentHandling.Disallow });

        try
        {
            if (!reader.Read() || reader.TokenType != JsonTokenType.StartObject)
            {
                diagnostics.Add(Invalid(path, "is not a JSON object of strings", text, offset));
                return new LocalStringFile(path, language, Array.Empty<LocalStringEntry>());
            }

            while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
            {
                var (line, column) = Position(text, offset + (int)reader.TokenStartIndex);
                var key = reader.GetString() ?? string.Empty;
                if (!reader.Read() || reader.TokenType != JsonTokenType.String)
                {
                    diagnostics.Add(new TranslationDiagnostic("JPKT001", true, $"\"{key}\" is not a string. Every value in a translation file is the text for its key.", path, line, column));
                    return new LocalStringFile(path, language, Array.Empty<LocalStringEntry>());
                }

                entries.Add(new LocalStringEntry(key, reader.GetString() ?? string.Empty, line, column));
            }

            if (reader.TokenType != JsonTokenType.EndObject || reader.Read())
            {
                diagnostics.Add(Invalid(path, "has more than one JSON object", text, offset + (int)reader.TokenStartIndex));
                return new LocalStringFile(path, language, Array.Empty<LocalStringEntry>());
            }
        }
        catch (JsonException e)
        {
            var line = (int)(e.LineNumber ?? 0) + 1;
            var column = (int)(e.BytePositionInLine ?? 0) + 1;
            var reason = e.Message.Split(" LineNumber:", 2)[0];
            diagnostics.Add(new TranslationDiagnostic("JPKT001", true, "The file is not valid JSON. " + reason, path, line, column));
            return new LocalStringFile(path, language, Array.Empty<LocalStringEntry>());
        }

        return new LocalStringFile(path, language, entries);
    }

    private static TranslationDiagnostic Invalid(string path, string problem, ReadOnlySpan<byte> text, int at)
    {
        var (line, column) = Position(text, at);
        return new TranslationDiagnostic("JPKT001", true, "The file " + problem + ".", path, line, column);
    }

    /// <summary>
    /// Finds the line and column of a byte in a file.
    /// </summary>
    /// <param name="text">The file's content.</param>
    /// <param name="at">The byte's offset.</param>
    /// <returns>The line and column, each from 1.</returns>
    internal static (int Line, int Column) Position(ReadOnlySpan<byte> text, int at)
    {
        var before = text[..Math.Min(at, text.Length)];
        var lastBreak = before.LastIndexOf((byte)'\n');
        var line = before.Count((byte)'\n') + 1;
        var column = Encoding.UTF8.GetCharCount(before[(lastBreak + 1)..]) + 1;
        return (line, column);
    }
}

/// <summary>
/// One key and its text in a plugin's translation file.
/// </summary>
/// <param name="Key">The key.</param>
/// <param name="Text">The text.</param>
/// <param name="Line">The key's line, from 1.</param>
/// <param name="Column">The key's column, from 1.</param>
internal sealed record LocalStringEntry(string Key, string Text, int Line, int Column);
