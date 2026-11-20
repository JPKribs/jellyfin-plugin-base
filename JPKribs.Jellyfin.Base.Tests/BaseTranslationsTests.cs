using System;
using System.Globalization;
using System.IO;
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
        using var json = JsonDocument.Parse(file.FileContents);
        var strings = json.RootElement.GetProperty("strings");
        Assert.Equal("de", json.RootElement.GetProperty("language").GetString());
        Assert.Equal("Meine Anfragen", strings.GetProperty("MyRequests").GetString());
        Assert.Equal("Only English", strings.GetProperty("OnlyEnglish").GetString());
        Assert.Contains("TV", json.RootElement.GetProperty("casing").EnumerateArray().Select(w => w.GetString()));
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

    /// <summary>
    /// Serve names the most specific language it has strings for, and US English for one it has none of.
    /// True: a page knows which language its strings are in.
    /// False: a page would label Portuguese strings as pt-pt.
    /// </summary>
    [Theory]
    [InlineData("pt-PT", "pt")]
    [InlineData("pt_BR", "pt-br")]
    [InlineData("xx", "en-us")]
    [InlineData(null, "en-us")]
    public void Serve_NamesTheLanguageItHas(string? asked, string language)
    {
        var context = new DefaultHttpContext();
        var file = Assert.IsType<FileContentResult>(BaseTranslations.Serve(asked, context.Request, context.Response));
        using var json = JsonDocument.Parse(file.FileContents);
        Assert.Equal(language, json.RootElement.GetProperty("language").GetString());
    }

    /// <summary>
    /// RequestLanguage reads the query, then the page's header, then Accept-Language by weight, then US English.
    /// True: server messages follow the page's language.
    /// False: a message would follow the browser over the page, or fail on a malformed header.
    /// </summary>
    [Theory]
    [InlineData("?language=pt_BR", "de", "fr", "pt-br")]
    [InlineData("", "de", "fr", "de")]
    [InlineData("?language=../x", "de", "fr", "de")]
    [InlineData("", "", "fr-CA,fr;q=0.9,en;q=0.8", "fr-ca")]
    [InlineData("", "", "en;q=0.2, de;q=0.9", "de")]
    [InlineData("", "", "*, bad value;q=x", "en-us")]
    [InlineData("", "", "", "en-us")]
    public void RequestLanguage_ReadsQueryThenHeaderThenAcceptLanguage(string query, string header, string accept, string language)
    {
        var context = new DefaultHttpContext();
        context.Request.QueryString = new QueryString(query);
        if (header.Length > 0)
        {
            context.Request.Headers[BaseTranslations.LanguageHeader] = header;
        }

        if (accept.Length > 0)
        {
            context.Request.Headers.AcceptLanguage = accept;
        }

        Assert.Equal(language, BaseTranslations.RequestLanguage(context.Request));
    }

    /// <summary>
    /// UseLanguage sets the language of Base's own text on the call path, and its scope puts the earlier one back.
    /// True: a refusal from the guard reads in the page's language for one request only.
    /// False: one request's language would leak into the next.
    /// </summary>
    [Fact]
    public void UseLanguage_TranslatesBaseTextForTheScope()
    {
        var guard = new SsrfGuard(allowPrivateNetwork: false);
        Assert.Null(BaseTranslations.CurrentLanguage);
        Assert.Equal("loopback addresses are not allowed", SsrfGuard.Classify(System.Net.IPAddress.Loopback, false));

        using (BaseTranslations.UseLanguage("de"))
        {
            Assert.Equal("de", BaseTranslations.CurrentLanguage);
            Assert.Equal("Loopback-Adressen sind nicht erlaubt", SsrfGuard.Classify(System.Net.IPAddress.Loopback, false));
            Assert.Equal("127.0.0.1 is refused, Loopback-Adressen sind nicht erlaubt", guard.ValidateUrl("http://127.0.0.1/"));
            Assert.Contains(System.Net.WebUtility.HtmlEncode("Zurück zu Jellyfin"), StatusPage.Render("Heading", "Message"), StringComparison.Ordinal);
        }

        Assert.Null(BaseTranslations.CurrentLanguage);
        Assert.Contains("Back to Jellyfin", StatusPage.Render("Heading", "Message"), StringComparison.Ordinal);
    }

    /// <summary>
    /// Base's C# writes its text with the English that strings/en-us.json ships, so every plugin gets the same words.
    /// True: a translation of Base's strings reaches the C# text.
    /// False: a key would be missing from the strings, or its English would drift from the code's.
    /// </summary>
    [Fact]
    public void BaseText_InTheCodeMatchesTheShippedStrings()
    {
        var root = Root();
        var shipped = JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(File.ReadAllBytes(Path.Combine(root, "strings", "en-us.json")))!;
        var used = new System.Collections.Generic.HashSet<string>(StringComparer.Ordinal);
        foreach (var file in Directory.EnumerateFiles(Path.Combine(root, "src"), "*.cs"))
        {
            foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(File.ReadAllText(file), "Text\\(\\s*\"(Base\\.[A-Za-z0-9]+)\",\\s*(\"(?:[^\"\\\\]|\\\\.)*\"|[A-Za-z]+)"))
            {
                var key = m.Groups[1].Value;
                used.Add(key);
                Assert.True(shipped.ContainsKey(key), key + " is not in strings/en-us.json");
                var english = m.Groups[2].Value.StartsWith('"') ? System.Text.RegularExpressions.Regex.Unescape(m.Groups[2].Value[1..^1]) : null;
                if (english is not null)
                {
                    Assert.Equal(english, shipped[key]);
                }
            }
        }

        Assert.Equal(SsrfGuard.PlainHttpRefusal, shipped["Base.SsrfPlainHttp"]);
        Assert.Equal(RedirectRefusingHandler.DefaultAdvice, shipped["Base.RedirectAdvice"]);
        Assert.Contains("Base.SsrfLoopback", used);
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
