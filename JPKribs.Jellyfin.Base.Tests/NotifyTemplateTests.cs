using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="NotifyTemplate"/> fills placeholders, custom bodies, and headers, and escapes what people wrote, as every channel needs.</summary>
public class NotifyTemplateTests
{
    private static readonly Dictionary<string, string> Values = new(StringComparer.OrdinalIgnoreCase)
    {
        ["title"] = "*Dune* (2021)",
        ["user"] = "viewer",
        ["reason"] = string.Empty
    };

    /// <summary>
    /// Placeholders are filled ignoring case, an unknown one stays as written, only the values are escaped, and a blank value leaves no doubled space.
    /// True: a template reads the same everywhere, with the escaping each channel needs.
    /// False: an administrator's own markdown would be escaped, or a typo would vanish.
    /// </summary>
    [Fact]
    public void Fill_FillsValuesEscapesOnlyThemAndTidies()
    {
        var filled = NotifyTemplate.Fill("**No** to {TITLE} for {user}. {reason} {unknown}", Values, NotifyTemplate.EscapeDiscord);

        Assert.Equal(@"**No** to \*Dune\* \(2021\) for viewer. {unknown}", filled);
        Assert.Equal("a  b", NotifyTemplate.Fill("a  b", Values, tidy: false));
        Assert.Equal(string.Empty, NotifyTemplate.Fill(null, Values));
    }

    /// <summary>
    /// A JSON body escapes each value for a JSON string, leaves out keys that come out empty, and inserts a JSON value without quotes.
    /// True: a title with quotes never breaks the body, and an empty value never sends an empty key.
    /// False: the post would be malformed JSON or carry empty keys a service refuses.
    /// </summary>
    [Fact]
    public void RenderBody_FillsJsonAndLeavesOutWhatIsEmpty()
    {
        var values = new Dictionary<string, string> { ["title"] = "Say \"Hi\"", ["reason"] = string.Empty, ["color"] = "42204" };
        var json = new Dictionary<string, JsonNode?> { ["request"] = new JsonObject { ["Title"] = "Say \"Hi\"", ["Note"] = string.Empty }, ["title"] = "ignored" };

        var (text, isJson) = NotifyTemplate.RenderBody("{\"t\": \"{title}\", \"why\": \"{reason}\", \"color\": {color}, \"request\": {request}, \"list\": [\"{reason}\"]}", values, json);

        Assert.True(isJson);
        Assert.Equal("{\"t\":\"Say \\u0022Hi\\u0022\",\"color\":42204,\"request\":{\"Title\":\"Say \\u0022Hi\\u0022\"}}", text);
    }

    /// <summary>
    /// A body that is not JSON is filled as text, with no escaping, and a JSON value goes in as JSON text.
    /// True: a plain text webhook such as ntfy gets the words as written.
    /// False: plain text would carry JSON escapes.
    /// </summary>
    [Fact]
    public void RenderBody_FillsTextWhenItIsNotJson()
    {
        var (text, isJson) = NotifyTemplate.RenderBody("{title} was approved. {request}", new Dictionary<string, string> { ["title"] = "Say \"Hi\"" }, new Dictionary<string, JsonNode?> { ["request"] = new JsonObject { ["a"] = 1 } });

        Assert.False(isJson);
        Assert.Equal("Say \"Hi\" was approved. {\"a\":1}", text);
    }

    /// <summary>
    /// Headers are read one a line, trimmed, with blank lines skipped and a colon kept in a value, and a line that is not a header refuses them all.
    /// True: a post never goes without a header it needs, such as its token.
    /// False: a bad line would be dropped and the post sent unauthenticated.
    /// </summary>
    [Fact]
    public void ParseHeaders_ReadsOneALineAndRefusesABadLine()
    {
        Assert.Equal(
            new[] { new KeyValuePair<string, string>("Authorization", "Bearer a:b"), new KeyValuePair<string, string>("X-Priority", "high") },
            NotifyTemplate.ParseHeaders("Authorization: Bearer a:b\r\n\n  X-Priority:high  "));
        Assert.Empty(NotifyTemplate.ParseHeaders(string.Empty)!);
        Assert.Empty(NotifyTemplate.ParseHeaders(null)!);
        Assert.Null(NotifyTemplate.ParseHeaders("no colon here"));
        Assert.Null(NotifyTemplate.ParseHeaders("Bad Name: x"));
        Assert.Null(NotifyTemplate.ParseHeaders(": no name"));
        Assert.Null(NotifyTemplate.ParseHeaders("X-Bell: a\u0007b"));
    }

    /// <summary>
    /// Discord's markdown is escaped, so a masked link, a mention, or a heading shows as typed.
    /// True: nothing people wrote posts a link or pings anyone under the webhook's name.
    /// False: a requester could post a masked phishing link.
    /// </summary>
    [Theory]
    [InlineData("[sign in](https://evil)", @"\[sign in\]\(https://evil\)")]
    [InlineData("@everyone # big", @"\@everyone \# big")]
    [InlineData(@"a\b_c~d`e|f>g<h*", @"a\\b\_c\~d\`e\|f\>g\<h\*")]
    [InlineData(null, "")]
    public void EscapeDiscord_EscapesEveryMarkdownCharacter(string? text, string expected)
    {
        Assert.Equal(expected, NotifyTemplate.EscapeDiscord(text));
    }

    /// <summary>
    /// Angle brackets are dropped from what people wrote, and text is cut with an ellipsis to its limit.
    /// True: no markup reaches a Jellyfin app, and no post passes a service's length limit.
    /// False: a title could become HTML on an administrator's screen, or Discord would refuse a long post.
    /// </summary>
    [Fact]
    public void StripMarkupAndClip_KeepTextSafeAndShort()
    {
        Assert.Equal("bscript/b", NotifyTemplate.StripMarkup("<b>script</b>"));
        Assert.Equal("abcd", NotifyTemplate.Clip("abcd", 4));
        Assert.Equal("abc…", NotifyTemplate.Clip("abcde", 4));
        Assert.Equal(string.Empty, NotifyTemplate.Clip(null, 4));
        Assert.Throws<ArgumentOutOfRangeException>(() => NotifyTemplate.Clip("a", 0));
    }
}
