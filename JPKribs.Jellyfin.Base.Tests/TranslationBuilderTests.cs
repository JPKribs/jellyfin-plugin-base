using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using JPKribs.Jellyfin.Base.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies the checks the translations build runs on a plugin's strings, and what it builds from them.</summary>
public class TranslationBuilderTests
{
    private static readonly JellyfinSnapshot _snapshot = Snapshot(
        web: new()
        {
            ["en-us"] = new() { ["Favorites"] = "Favorites", ["Movies"] = "Movies", ["StorageType.Network"] = "Network", ["LabelTitle"] = "Title", ["MediaInfoTitle"] = "Title" },
            ["de"] = new() { ["Favorites"] = "Favoriten", ["Movies"] = "Filme" },
            ["pt-br"] = new() { ["Favorites"] = "Favoritos" }
        },
        server: new()
        {
            ["en-us"] = new() { ["Movies"] = "Movies", ["Books"] = "Books" },
            ["de"] = new() { ["Movies"] = "Spielfilme", ["Books"] = "Bücher" },
            ["fr"] = new() { ["Books"] = "Livres" }
        });

    /// <summary>
    /// Clean strings build with no problem, each language holding its declared Jellyfin strings and its own.
    /// True: a plugin gets every language Jellyfin has for what it declares.
    /// False: a declared string would be missing in a language Jellyfin translates it into.
    /// </summary>
    [Fact]
    public void Build_MergesDeclaredAndLocalStringsByLanguage()
    {
        var result = Build(
            new[] { File("en-us", "{\"MyRequests\": \"My Requests\"}"), File("de", "{\"MyRequests\": \"Meine Anfragen\"}") },
            new[] { new DeclaredString("Favorites"), new DeclaredString("Books") });

        Assert.Empty(result.Diagnostics);
        Assert.Equal(new[] { "de", "en-us", "fr", "pt-br" }, result.Languages.Keys);
        Assert.Equal("Favoriten", result.Languages["de"]["Favorites"]);
        Assert.Equal("Bücher", result.Languages["de"]["Books"]);
        Assert.Equal("Meine Anfragen", result.Languages["de"]["MyRequests"]);
        Assert.Equal(new[] { "Books" }, result.Languages["fr"].Keys);
        Assert.Equal(new[] { "Favorites" }, result.Languages["pt-br"].Keys);
        Assert.Equal(new[] { "Books", "Favorites", "MyRequests" }, result.Keys.Keys);
    }

    /// <summary>
    /// A key both sources have is taken from the web client, unless the item names the server.
    /// True: the plugin says what the web client says.
    /// False: the wording would depend on source order.
    /// </summary>
    [Fact]
    public void Build_TakesTheWebClientFirstUnlessSourceSaysServer()
    {
        Assert.Equal("Filme", Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Movies") }).Languages["de"]["Movies"]);
        Assert.Equal("Spielfilme", Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Movies", "server") }).Languages["de"]["Movies"]);
        Assert.Equal("Spielfilme", Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Movies", "Server") }).Languages["de"]["Movies"]);
    }

    /// <summary>
    /// A key repeated in one file fails, on the line of the repeat.
    /// True: no string silently replaces another.
    /// False: the last entry would win unseen.
    /// </summary>
    [Fact]
    public void Build_RepeatedKey_IsJPKT002()
    {
        var result = Build(new[] { File("en-us", "{\n  \"A\": \"One\",\n  \"A\": \"Two\"\n}") });
        var d = Assert.Single(result.Diagnostics);
        Assert.Equal(("JPKT002", true, 3, 3), (d.Code, d.IsError, d.Line, d.Column));
        Assert.Contains("line 2", d.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// Two local keys with the same English fail.
    /// True: one string is said once.
    /// False: translators would translate the same text twice.
    /// </summary>
    [Fact]
    public void Build_SameEnglishTwice_IsJPKT003()
    {
        var d = Assert.Single(Build(new[] { File("en-us", "{\"A\": \"Same\", \"B\": \"Same\"}") }).Diagnostics);
        Assert.Equal("JPKT003", d.Code);
        Assert.Contains("\"A\"", d.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// A local key that is a Jellyfin key fails, whether or not the plugin declares it.
    /// True: a key names one string.
    /// False: the plugin's string would shadow Jellyfin's under the same name.
    /// </summary>
    [Fact]
    public void Build_JellyfinKey_IsJPKT004()
    {
        var same = Assert.Single(Build(new[] { File("en-us", "{\"Books\": \"Books\"}") }).Diagnostics);
        Assert.Equal("JPKT004", same.Code);
        Assert.Contains("<JellyfinString Include=\"Books\" />", same.Message, StringComparison.Ordinal);
        var different = Assert.Single(Build(new[] { File("en-us", "{\"Favorites\": \"Starred\"}") }).Diagnostics);
        Assert.Contains("Rename it", different.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// English a declared Jellyfin string already says fails.
    /// True: the plugin uses the Jellyfin string it declared.
    /// False: two strings would say the same thing.
    /// </summary>
    [Fact]
    public void Build_DeclaredEnglish_IsJPKT005()
    {
        var d = Assert.Single(Build(new[] { File("en-us", "{\"Faves\": \"Favorites\"}") }, new[] { new DeclaredString("Favorites") }).Diagnostics);
        Assert.Equal(("JPKT005", true), (d.Code, d.IsError));
    }

    /// <summary>
    /// English a Jellyfin string says, under a key the plugin has not declared, warns and names every such key.
    /// True: the plugin learns which Jellyfin string to declare.
    /// False: a duplicate of Jellyfin's string would go unnoticed.
    /// </summary>
    [Fact]
    public void Build_UndeclaredEnglish_IsJPKT006Warning()
    {
        var d = Assert.Single(Build(new[] { File("en-us", "{\"SortTitle\": \"Title\"}") }).Diagnostics);
        Assert.Equal(("JPKT006", false), (d.Code, d.IsError));
        Assert.Contains("\"LabelTitle\", \"MediaInfoTitle\"", d.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// A JellyfinTextMatch keeps a local string whose English matches, and a stale one warns.
    /// True: a string whose meaning differs builds clean, and a leftover mark is found.
    /// False: the warning could never be answered, or a mark would outlive its string.
    /// </summary>
    [Fact]
    public void Build_TextMatch_SilencesJPKT006_AndStaleIsJPKT013()
    {
        var files = new[] { File("en-us", "{\"Network\": \"Network\", \"Other\": \"Other\"}") };
        Assert.Empty(Build(files, allowed: new[] { "Network" }).Diagnostics);
        var stale = Build(files, allowed: new[] { "Network", "Other", "Gone" }).Diagnostics;
        Assert.All(stale, d => Assert.Equal(("JPKT013", false), (d.Code, d.IsError)));
        Assert.Equal(2, stale.Count);
    }

    /// <summary>
    /// A declared key Jellyfin lacks fails, with a suggestion when only the case differs, and a bad Source fails.
    /// True: a typo in the project file is caught at build.
    /// False: the page would show the raw key.
    /// </summary>
    [Fact]
    public void Build_UnknownDeclaredKey_IsJPKT007()
    {
        var typo = Assert.Single(Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("favorites") }).Diagnostics);
        Assert.Equal("JPKT007", typo.Code);
        Assert.Contains("Did you mean \"Favorites\"?", typo.Message, StringComparison.Ordinal);
        Assert.Equal("JPKT007", Assert.Single(Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Favorites", "server") }).Diagnostics).Code);
        Assert.Equal("JPKT007", Assert.Single(Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Favorites", "cloud") }).Diagnostics).Code);
    }

    /// <summary>
    /// A language with a key US English lacks fails, and different placeholders warn.
    /// True: every translation translates a US English string, with its values.
    /// False: a translation would show an orphan string or drop a value.
    /// </summary>
    [Fact]
    public void Build_Translation_IsCheckedAgainstEnglish()
    {
        var result = Build(new[]
        {
            File("en-us", "{\"Left\": \"{0} of {1} left\"}"),
            File("de", "{\"Left\": \"{0} übrig\", \"Extra\": \"x\"}")
        });
        Assert.Equal(new[] { "JPKT011", "JPKT008" }, result.Diagnostics.Select(d => d.Code));
        Assert.False(result.Diagnostics[0].IsError);
        Assert.True(result.Diagnostics[1].IsError);
    }

    /// <summary>
    /// Two files for one language fail, as does a set of languages with no US English.
    /// True: every key has its US English to fall back to.
    /// False: a string could be missing in every language.
    /// </summary>
    [Fact]
    public void Build_LanguageFiles_AreOnePerLanguageWithEnglish()
    {
        var two = Build(new[] { File("en-us", "{}"), File("en-us", "{}", "en_US.json") });
        Assert.Equal("JPKT009", Assert.Single(two.Diagnostics).Code);
        Assert.Equal("JPKT010", Assert.Single(Build(new[] { File("de", "{\"A\": \"a\"}") }).Diagnostics).Code);
    }

    /// <summary>
    /// Empty English fails, and an empty translation is left out so the string falls back.
    /// True: every language shows text.
    /// False: a string would show as nothing.
    /// </summary>
    [Fact]
    public void Build_EmptyText_FailsInEnglishAndFallsBackElsewhere()
    {
        Assert.Equal("JPKT012", Assert.Single(Build(new[] { File("en-us", "{\"A\": \"\"}") }).Diagnostics).Code);
        var result = Build(new[] { File("en-us", "{\"A\": \"a\", \"B\": \"b\"}"), File("de", "{\"A\": \"\", \"B\": \"bb\"}") });
        Assert.Empty(result.Diagnostics);
        Assert.Equal(new[] { "B" }, result.Languages["de"].Keys);
    }

    /// <summary>
    /// A file that is not a flat JSON object of strings fails with where it went wrong.
    /// True: a broken file is pointed at, not skipped.
    /// False: the build would ship no strings for that language.
    /// </summary>
    [Theory]
    [InlineData("[1, 2]")]
    [InlineData("{\"A\": 1}")]
    [InlineData("{\"A\": {\"B\": \"c\"}}")]
    [InlineData("{\"A\": \"a\"")]
    [InlineData("{} {}")]
    [InlineData("{\"A\": \"a\", /* note */ \"B\": \"b\"}")]
    public void Parse_NotAnObjectOfStrings_IsJPKT001(string json)
    {
        var diagnostics = new List<TranslationDiagnostic>();
        var file = LocalStringFile.Parse("en-us.json", "en-us", Encoding.UTF8.GetBytes(json), diagnostics);
        Assert.Empty(file.Entries);
        Assert.Equal("JPKT001", Assert.Single(diagnostics).Code);
    }

    /// <summary>
    /// A file with a byte order mark reads, and each entry keeps its line and column.
    /// True: an editor that writes a BOM is fine, and errors point at the right place.
    /// False: the file would fail to read, or point at the wrong line.
    /// </summary>
    [Fact]
    public void Parse_KeepsLinesAndSkipsByteOrderMark()
    {
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes("{\n  \"A\": \"a\",\n    \"Bé\": \"b\"\n}")).ToArray();
        var diagnostics = new List<TranslationDiagnostic>();
        var file = LocalStringFile.Parse("en-us.json", "en-us", bytes, diagnostics);
        Assert.Empty(diagnostics);
        Assert.Equal(new[] { (2, 3), (3, 5) }, file.Entries.Select(e => (e.Line, e.Column)));
        Assert.Equal("Bé", file.Entries[1].Key);
    }

    /// <summary>
    /// A file name gives its language as the web client compares them, and anything else is refused.
    /// True: pt_BR.json and pt-br.json are one language.
    /// False: a note or a misnamed file would build as a language.
    /// </summary>
    [Theory]
    [InlineData("en-us", "en-us", true)]
    [InlineData("pt_BR", "pt-br", true)]
    [InlineData("zh-Hant-TW", "zh-hant-tw", true)]
    [InlineData("notes", "notes", false)]
    [InlineData("e", "e", false)]
    public void TryLanguageCode_NormalizesAndChecks(string name, string code, bool valid)
    {
        Assert.Equal(valid, TranslationBuilder.TryLanguageCode(name, out var read));
        Assert.Equal(code, read);
    }

    private static TranslationResult Build(IReadOnlyList<LocalStringFile> files, IReadOnlyList<DeclaredString>? declared = null, IReadOnlyCollection<string>? allowed = null)
        => TranslationBuilder.Build(files, declared ?? Array.Empty<DeclaredString>(), allowed ?? Array.Empty<string>(), _snapshot);

    private static LocalStringFile File(string language, string json, string? name = null)
    {
        var diagnostics = new List<TranslationDiagnostic>();
        var file = LocalStringFile.Parse(name ?? language + ".json", language, Encoding.UTF8.GetBytes(json), diagnostics);
        Assert.Empty(diagnostics);
        return file;
    }

    private static JellyfinSnapshot Snapshot(Dictionary<string, Dictionary<string, string>> web, Dictionary<string, Dictionary<string, string>> server)
    {
        var sources = new Dictionary<string, Dictionary<string, Dictionary<string, string>>> { ["web"] = web, ["server"] = server };
        var languages = sources.ToDictionary(s => s.Key, s => (IReadOnlyList<string>)s.Value.Keys.ToList());
        return new JellyfinSnapshot("web test, server test", languages, (source, language) => sources[source].TryGetValue(language, out var strings) ? strings : null);
    }
}
