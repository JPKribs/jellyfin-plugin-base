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

    /// <summary>
    /// Case converts a declared string's text in every English language and in TranslationKeys, with the casing list, and leaves other languages.
    /// True: a plugin ships Jellyfin's words in its own casing.
    /// False: a translation would be recased, or the editor would show text the plugin does not ship.
    /// </summary>
    [Fact]
    public void Build_CaseConvertsEnglishOnly()
    {
        var snapshot = Snapshot(
            web: new()
            {
                ["en-us"] = new() { ["Guide"] = "Open The Epg Guide" },
                ["en-gb"] = new() { ["Guide"] = "Open The Epg Guide" },
                ["de"] = new() { ["Guide"] = "Den EPG Führer Öffnen" }
            },
            server: new());
        var result = TranslationBuilder.Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Guide", null, "Sentence") }, Array.Empty<string>(), snapshot, null, new[] { "EPG" });

        Assert.Empty(result.Diagnostics);
        Assert.Equal("Open the EPG guide", result.Languages["en-us"]["Guide"]);
        Assert.Equal("Open the EPG guide", result.Languages["en-gb"]["Guide"]);
        Assert.Equal("Den EPG Führer Öffnen", result.Languages["de"]["Guide"]);
        Assert.Equal("Open the EPG guide", result.Keys["Guide"]);
    }

    /// <summary>
    /// A Case other than title or sentence fails.
    /// True: a typo in Case is caught.
    /// False: the string would ship unconverted unseen.
    /// </summary>
    [Fact]
    public void Build_UnknownCase_IsJPKT020()
    {
        var d = Assert.Single(Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Favorites", null, "upper") }).Diagnostics);
        Assert.Equal(("JPKT020", true), (d.Code, d.IsError));
    }

    /// <summary>
    /// A plugin key that starts with Base. fails, so it can never meet one of Base's own keys.
    /// True: Base's text can never be replaced by accident.
    /// False: a plugin key could silently shadow a Base string.
    /// </summary>
    [Fact]
    public void Build_BaseKey_IsJPKT021()
    {
        var d = Assert.Single(Build(new[] { File("en-us", "{\n  \"Base.LoadMore\": \"More\"\n}") }).Diagnostics);
        Assert.Equal(("JPKT021", true, 2, 3), (d.Code, d.IsError, d.Line, d.Column));
    }

    /// <summary>
    /// Base's own strings join every plugin's, its declarations merge with the plugin's without a repeat error, the
    /// plugin's own declaration wins, taking Base's case when it names none, and only the plugin's keys reach TranslationKeys.
    /// True: every plugin gets Base's text, and a key both declare is built in once as the plugin asked.
    /// False: a plugin that declares a key Base uses would fail, or TranslationKeys would fill with Base's keys.
    /// </summary>
    [Fact]
    public void Build_MergesBaseStrings()
    {
        var shared = new SharedStrings(
            new[] { File("en-us", "{\"Base.LoadMore\": \"Load more\"}") },
            new[] { new DeclaredString("Favorites", null, "title"), new DeclaredString("Movies", "server"), new DeclaredString("LabelTitle", null, "sentence") });
        var result = TranslationBuilder.Build(
            new[] { File("en-us", "{\"MyTitle\": \"My Title\"}") },
            new[] { new DeclaredString("Movies"), new DeclaredString("LabelTitle") },
            Array.Empty<string>(),
            _snapshot,
            shared,
            null);

        Assert.Empty(result.Diagnostics);
        Assert.Equal("Load more", result.Languages["en-us"]["Base.LoadMore"]);
        Assert.Equal("Filme", result.Languages["de"]["Movies"]);
        Assert.Equal("Favoriten", result.Languages["de"]["Favorites"]);
        Assert.Equal(new[] { "LabelTitle", "Movies", "MyTitle" }, result.Keys.Keys);

        var snapshot = Snapshot(web: new() { ["en-us"] = new() { ["SelectAll"] = "Select All" } }, server: new());
        var baseCase = new SharedStrings(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("SelectAll", null, "sentence") });
        var taken = TranslationBuilder.Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("SelectAll") }, Array.Empty<string>(), snapshot, baseCase, null);
        Assert.Equal("Select all", taken.Languages["en-us"]["SelectAll"]);
        Assert.Equal("Select all", taken.Keys["SelectAll"]);
        var kept = TranslationBuilder.Build(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("SelectAll", null, "title") }, Array.Empty<string>(), snapshot, baseCase, null);
        Assert.Equal("Select All", kept.Languages["en-us"]["SelectAll"]);
    }

    /// <summary>
    /// A local string whose English matches a string only Base declares warns, as an undeclared Jellyfin string does, and does not fail.
    /// True: a plugin that says "Favorites" itself keeps building when Base starts using Favorites.
    /// False: a Base release would break plugins with JPKT005.
    /// </summary>
    [Fact]
    public void Build_BaseDeclarationNeverFailsAPluginString()
    {
        var shared = new SharedStrings(Array.Empty<LocalStringFile>(), new[] { new DeclaredString("Favorites") });
        var result = TranslationBuilder.Build(new[] { File("en-us", "{\"MyFavorites\": \"Favorites\"}") }, Array.Empty<DeclaredString>(), Array.Empty<string>(), _snapshot, shared, null);
        var d = Assert.Single(result.Diagnostics);
        Assert.Equal(("JPKT006", false), (d.Code, d.IsError));
    }

    /// <summary>
    /// A casing list that is not an array of strings, has an empty entry, or repeats a word ignoring case fails at its line.
    /// True: the author sees each problem where it is.
    /// False: a bad list would ship or be silently cut.
    /// </summary>
    [Fact]
    public void CasingFile_ReportsEachProblemAtItsLine()
    {
        var diagnostics = new List<TranslationDiagnostic>();
        var words = CasingFile.Parse("casing.json", Encoding.UTF8.GetBytes("[\n  \"EPG\",\n  \" \",\n  \"epg\",\n  \"Apple Music\"\n]"), diagnostics);
        Assert.Equal(new[] { "EPG", "Apple Music" }, words);
        Assert.Equal(new[] { ("JPKT018", 3), ("JPKT019", 4) }, diagnostics.Select(d => (d.Code, d.Line)));

        diagnostics.Clear();
        Assert.Empty(CasingFile.Parse("casing.json", Encoding.UTF8.GetBytes("{\"EPG\": true}"), diagnostics));
        Assert.Equal("JPKT017", Assert.Single(diagnostics).Code);

        diagnostics.Clear();
        Assert.Empty(CasingFile.Parse("casing.json", Encoding.UTF8.GetBytes("[\"EPG\", 4]"), diagnostics));
        Assert.Equal("JPKT017", Assert.Single(diagnostics).Code);

        diagnostics.Clear();
        Assert.Empty(CasingFile.Parse("casing.json", Encoding.UTF8.GetBytes("[\"EPG\""), diagnostics));
        Assert.Equal("JPKT017", Assert.Single(diagnostics).Code);
    }

    /// <summary>
    /// Base's own strings follow every rule a plugin's do against the Jellyfin strings the package carries: keys start
    /// with Base., no text is said twice, and none says what a Jellyfin string says unless listed as a text match.
    /// True: Base uses Jellyfin's words wherever Jellyfin has them, so they arrive translated.
    /// False: Base would ship English for words Jellyfin already translates.
    /// </summary>
    [Fact]
    public void BaseStrings_FollowThePluginRules()
    {
        var root = Root();
        var snapshot = JellyfinSnapshot.Load(System.IO.Path.Combine(root, "dist", "jellyfin"));
        Assert.NotNull(snapshot);
        var folder = System.IO.Path.Combine(root, "strings");
        var diagnostics = new List<TranslationDiagnostic>();
        var files = System.IO.Directory.EnumerateFiles(folder, "*.json")
            .Where(f => TranslationBuilder.TryLanguageCode(System.IO.Path.GetFileNameWithoutExtension(f), out _))
            .Select(f =>
            {
                TranslationBuilder.TryLanguageCode(System.IO.Path.GetFileNameWithoutExtension(f), out var language);
                return LocalStringFile.Parse(f, language, System.IO.File.ReadAllBytes(f), diagnostics);
            })
            .ToList();
        var declarations = SharedDeclarations.Read(System.IO.Path.Combine(folder, SharedDeclarations.FileName));

        Assert.NotEmpty(declarations.Strings);
        diagnostics.AddRange(TranslationBuilder.CheckShared(new SharedStrings(files, declarations.Strings), declarations.TextMatches, snapshot!));
        Assert.True(diagnostics.Count == 0, string.Join(Environment.NewLine, diagnostics.Select(d => d.Code + " " + d.Message)));
    }

    private static string Root()
    {
        var dir = new System.IO.DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !System.IO.File.Exists(System.IO.Path.Combine(dir.FullName, "jellyfin.json")))
        {
            dir = dir.Parent;
        }

        return dir?.FullName ?? throw new InvalidOperationException("The repository root, with jellyfin.json, was not found.");
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
