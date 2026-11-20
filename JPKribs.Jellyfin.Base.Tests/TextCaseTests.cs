using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Verifies that <see cref="TextCase"/> writes English in title and sentence case by the rules the page's titleCase and sentenceCase share.
/// The tests call it as a static method, since the translations task compiles a second copy this assembly also sees.
/// </summary>
public class TextCaseTests
{
    /// <summary>Gets every shared case, from Fixtures/casing-cases.json, which the JS tests run too.</summary>
    public static TheoryData<string, string, string, string?, string> SharedCases
    {
        get
        {
            var data = new TheoryData<string, string, string, string?, string>();
            using var json = JsonDocument.Parse(File.ReadAllBytes(Path.Combine(Root(), "JPKribs.Jellyfin.Base.Tests", "Fixtures", "casing-cases.json")));
            foreach (var c in json.RootElement.EnumerateArray())
            {
                var exceptions = c.TryGetProperty("exceptions", out var e) ? string.Join("|", e.EnumerateArray().Select(w => w.GetString())) : string.Empty;
                var language = c.TryGetProperty("language", out var l) ? l.GetString() : null;
                data.Add(c.GetProperty("case").GetString()!, c.GetProperty("text").GetString()!, exceptions, language, c.GetProperty("expected").GetString()!);
            }

            return data;
        }
    }

    /// <summary>
    /// Every shared case gives the result the page gives.
    /// True: text a plugin cases in C# and on a page reads the same.
    /// False: the server and the page would case one string two ways.
    /// </summary>
    /// <param name="mode">title or sentence.</param>
    /// <param name="text">The text.</param>
    /// <param name="exceptions">The exceptions, separated by a bar.</param>
    /// <param name="language">The language.</param>
    /// <param name="expected">The result.</param>
    [Theory]
    [MemberData(nameof(SharedCases))]
    public void Convert_GivesTheSharedResult(string mode, string text, string exceptions, string? language, string expected)
    {
        var words = exceptions.Length == 0 ? null : exceptions.Split('|');
        var actual = mode == "title" ? TextCase.ToTitleCase(text, words, language) : TextCase.ToSentenceCase(text, words, language);
        Assert.Equal(expected, actual);
    }

    /// <summary>
    /// Only English is converted.
    /// True: German keeps its capitals, and en-GB converts like en-US.
    /// False: a translation would be recased by English rules.
    /// </summary>
    /// <param name="language">The language.</param>
    /// <param name="english">Whether it converts.</param>
    [Theory]
    [InlineData(null, true)]
    [InlineData("", true)]
    [InlineData("en", true)]
    [InlineData("EN-gb", true)]
    [InlineData("en_US", true)]
    [InlineData("eng", false)]
    [InlineData("de", false)]
    [InlineData("pt-br", false)]
    public void IsEnglish_OnlyEnglish(string? language, bool english)
    {
        Assert.Equal(english, TextCase.IsEnglish(language));
    }

    /// <summary>
    /// The defaults are the short documented list, and with no casing list built in, the exceptions are the defaults.
    /// True: every plugin keeps TV and URL as written.
    /// False: a default would be missing or one would be added unseen.
    /// </summary>
    [Fact]
    public void Exceptions_AreTheDefaultsWithNoCasingList()
    {
        Assert.Equal(new[] { "Jellyfin", "TV", "ID", "API", "URL", "HTTP", "HTTPS", "IP", "DNS", "HDR", "SDR", "4K" }, TextCase.DefaultExceptions);
        Assert.Equal(TextCase.DefaultExceptions.OrderBy(w => w, StringComparer.Ordinal), TextCase.Exceptions.OrderBy(w => w, StringComparer.Ordinal));
    }

    /// <summary>
    /// A later spelling of an exception wins, and a null text throws.
    /// True: a plugin can respell a default, such as Id for ID.
    /// False: the default would always win, or a null would pass silently.
    /// </summary>
    [Fact]
    public void Convert_LaterSpellingWins_AndNullThrows()
    {
        Assert.Equal("The user Id", TextCase.ToSentenceCase("the user id", new List<string> { "Id" }));
        Assert.Throws<ArgumentNullException>(() => TextCase.ToTitleCase(null!));
    }

    private static string Root()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "jellyfin.json")))
        {
            dir = dir.Parent;
        }

        return dir?.FullName ?? throw new InvalidOperationException("The repository root, with jellyfin.json, was not found.");
    }
}
