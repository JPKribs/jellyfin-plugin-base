using System;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="BaseTranslations"/> reads the embedded strings with the web client's fallback, formats them, and serves them.</summary>
public class BaseTranslationsTests
{
    /// <summary>
    /// The languages are the embedded files.
    /// True: a plugin can list what it ships.
    /// False: a language would be missing or invented.
    /// </summary>
    [Fact]
    public void Languages_AreTheEmbeddedFiles()
    {
        Assert.Equal(new[] { "de", "en-us", "pt", "pt-br" }, BaseTranslations.Languages.OrderBy(l => l, StringComparer.Ordinal));
    }

    /// <summary>
    /// A string falls back to the language's base, then to US English, string by string.
    /// True: pt-br shows its own, then Portuguese, then English.
    /// False: a string missing from pt-br would show as its key.
    /// </summary>
    [Fact]
    public void For_FallsBackToBaseThenEnglish()
    {
        var strings = BaseTranslations.For("pt_BR");
        Assert.Equal("Minhas solicitações", strings["MyRequests"]);
        Assert.Equal("Favoritos", strings["Favorites"]);
        Assert.Equal("Only English", strings["OnlyEnglish"]);
        Assert.Equal("Favoritos", BaseTranslations.For("pt-PT")["Favorites"]);
    }

    /// <summary>
    /// No language, an unknown one, or text that is not a language code gives US English.
    /// True: a request can never pick a file by path or fail.
    /// False: a crafted code would read another resource or throw.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("xx")]
    [InlineData("../de")]
    [InlineData("de.json")]
    public void For_AnythingElse_IsEnglish(string? language)
    {
        Assert.Equal("My Requests", BaseTranslations.For(language)["MyRequests"]);
    }

    /// <summary>
    /// Get gives the string, or the key when no language has it.
    /// True: a missing string shows as its key, never as an exception.
    /// False: a typo would throw at runtime.
    /// </summary>
    [Fact]
    public void Get_GivesTheStringOrTheKey()
    {
        Assert.Equal("Meine Anfragen", BaseTranslations.Get("MyRequests", "de"));
        Assert.Equal("My Requests", BaseTranslations.Get("MyRequests"));
        Assert.Equal("Nope", BaseTranslations.Get("Nope", "de"));
    }

    /// <summary>
    /// Format fills placeholders with values formatted for the language, and keeps anything else.
    /// True: a number reads as the language writes it, and a bad translation cannot throw.
    /// False: string.Format would throw on a stray brace.
    /// </summary>
    [Fact]
    public void Format_FillsPlaceholdersForTheLanguage()
    {
        Assert.Equal("1,5 von 3 übrig", BaseTranslations.Format("QuotaLeft", "de", 1.5, 3));
        Assert.Equal("1.5 of 3 left", BaseTranslations.Format("QuotaLeft", null, 1.5, 3));
        Assert.Equal("a {1} {x} { b", BaseTranslations.FormatText("{0} {1} {x} { b", CultureInfo.InvariantCulture, "a"));
        Assert.Equal("{0}", BaseTranslations.FormatText("{0}", null));
    }

    /// <summary>
    /// A language code is written as the web client compares them.
    /// True: pt_BR and pt-br are one language.
    /// False: a code in another form would miss its file.
    /// </summary>
    [Theory]
    [InlineData("pt_BR", "pt-br")]
    [InlineData(" DE ", "de")]
    [InlineData("not a code", "")]
    [InlineData(null, "")]
    public void NormalizeLanguage_LowerCaseWithHyphen(string? language, string code)
    {
        Assert.Equal(code, BaseTranslations.NormalizeLanguage(language));
    }

    /// <summary>
    /// The server's language is its display culture.
    /// True: an activity entry is written in the server's language.
    /// False: it would always be English.
    /// </summary>
    [Fact]
    public void ServerLanguage_IsTheDisplayCulture()
    {
        var config = Substitute.For<IServerConfigurationManager>();
        config.Configuration.Returns(new ServerConfiguration { UICulture = "de-DE" });
        Assert.Equal("de-DE", BaseTranslations.ServerLanguage(config));
    }

    /// <summary>
    /// Serve answers the merged strings with an ETag, and 304 when the page has them.
    /// True: a page revalidates cheaply and sees a plugin update at once.
    /// False: a page would keep stale strings, or download them on every load.
    /// </summary>
    [Fact]
    public void Serve_AnswersJsonWithETagAndNotModified()
    {
        var context = new DefaultHttpContext();
        var file = Assert.IsType<FileContentResult>(BaseTranslations.Serve("de", context.Request, context.Response));
        var strings = JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(file.FileContents)!;
        Assert.Equal("Meine Anfragen", strings["MyRequests"]);
        Assert.Equal("Only English", strings["OnlyEnglish"]);
        Assert.Equal("no-cache", context.Response.Headers.CacheControl.ToString());
        var etag = context.Response.Headers.ETag.ToString();
        Assert.StartsWith("\"", etag, StringComparison.Ordinal);

        var again = new DefaultHttpContext();
        again.Request.Headers.IfNoneMatch = etag;
        var notModified = Assert.IsType<StatusCodeResult>(BaseTranslations.Serve("de", again.Request, again.Response));
        Assert.Equal(304, notModified.StatusCode);

        var other = new DefaultHttpContext();
        BaseTranslations.Serve("pt-br", other.Request, other.Response);
        Assert.NotEqual(etag, other.Response.Headers.ETag.ToString());
    }
}
