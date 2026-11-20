using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;

namespace JPKribs.Jellyfin.Base.Tasks;

/// <summary>
/// A plugin's casing list, Localization/casing.json: a JSON array of the words and phrases title case and sentence
/// case keep as written, such as ["EPG", "Apple Music"].
/// </summary>
internal static class CasingFile
{
    /// <summary>The file's name in the Localization folder.</summary>
    public const string FileName = "casing.json";

    /// <summary>
    /// Reads a casing list. A problem gives a JPKT017, JPKT018, or JPKT019 error at its line.
    /// </summary>
    /// <param name="path">The file's path, as the project names it.</param>
    /// <param name="bytes">The file's content.</param>
    /// <param name="diagnostics">Receives the problems found.</param>
    /// <returns>The words in file order, each once, or an empty list when the file is not an array of strings.</returns>
    public static IReadOnlyList<string> Parse(string path, byte[] bytes, ICollection<TranslationDiagnostic> diagnostics)
    {
        ArgumentNullException.ThrowIfNull(bytes);
        ArgumentNullException.ThrowIfNull(diagnostics);

        var words = new List<string>();
        var lines = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var text = bytes.AsSpan();
        var bom = Encoding.UTF8.Preamble;
        var offset = text.StartsWith(bom) ? bom.Length : 0;
        var reader = new Utf8JsonReader(text[offset..]);

        try
        {
            if (!reader.Read() || reader.TokenType != JsonTokenType.StartArray)
            {
                var (line, column) = LocalStringFile.Position(text, offset + (int)reader.TokenStartIndex);
                diagnostics.Add(new TranslationDiagnostic("JPKT017", true, "The casing list is not a JSON array of strings, such as [\"EPG\", \"Apple Music\"].", path, line, column));
                return Array.Empty<string>();
            }

            while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
            {
                var (line, column) = LocalStringFile.Position(text, offset + (int)reader.TokenStartIndex);
                if (reader.TokenType != JsonTokenType.String)
                {
                    diagnostics.Add(new TranslationDiagnostic("JPKT017", true, "Every entry in the casing list is a string.", path, line, column));
                    return Array.Empty<string>();
                }

                var word = (reader.GetString() ?? string.Empty).Trim();
                if (word.Length == 0)
                {
                    diagnostics.Add(new TranslationDiagnostic("JPKT018", true, "An entry in the casing list is empty. Remove it.", path, line, column));
                    continue;
                }

                if (lines.TryGetValue(word, out var first))
                {
                    diagnostics.Add(new TranslationDiagnostic("JPKT019", true, $"\"{word}\" is already on line {first}, ignoring case. Keep one entry.", path, line, column));
                    continue;
                }

                lines[word] = line;
                words.Add(word);
            }

            if (reader.Read())
            {
                var (line, column) = LocalStringFile.Position(text, offset + (int)reader.TokenStartIndex);
                diagnostics.Add(new TranslationDiagnostic("JPKT017", true, "The casing list has more than one JSON value.", path, line, column));
                return Array.Empty<string>();
            }
        }
        catch (JsonException e)
        {
            var reason = e.Message.Split(" LineNumber:", 2)[0];
            diagnostics.Add(new TranslationDiagnostic("JPKT017", true, "The casing list is not valid JSON. " + reason, path, (int)(e.LineNumber ?? 0) + 1, (int)(e.BytePositionInLine ?? 0) + 1));
            return Array.Empty<string>();
        }

        return words;
    }
}
