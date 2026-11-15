using System.Collections.Generic;
using JPKribs.Jellyfin.Base;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="TemplateLoader"/> loads an embedded template and fills its tokens in a single pass.</summary>
public class TemplateLoaderTests
{
    /// <summary>
    /// A template is loaded by name from the embedded resources.
    /// True: a plugin finds the package's own templates.
    /// False: the template would be missing at run time.
    /// </summary>
    [Fact]
    public void Load_ReturnsEmbeddedTemplate()
    {
        var html = TemplateLoader.Load("status");
        Assert.Contains("jpk-status-card", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// Every token with a value is replaced.
    /// True: the filled page shows the values.
    /// False: a literal token would remain.
    /// </summary>
    [Fact]
    public void Fill_ReplacesTokens()
    {
        var html = TemplateLoader.Fill("status", new Dictionary<string, string>
        {
            ["TITLE"] = "T",
            ["HEADING"] = "Heading text",
            ["MESSAGE"] = "Message text",
            ["SPINNER"] = string.Empty,
            ["BUTTON"] = string.Empty,
            ["CONTENT"] = string.Empty
        });

        Assert.Contains("Heading text", html, System.StringComparison.Ordinal);
        Assert.Contains("Message text", html, System.StringComparison.Ordinal);
        Assert.DoesNotContain("{{", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// A substituted value that looks like a token is not expanded again.
    /// True: text from a request cannot pull in another value.
    /// False: a value could inject a token the plugin never meant to fill.
    /// </summary>
    [Fact]
    public void Fill_IsSinglePass_SubstitutedValuesAreNotRescanned()
    {
        var html = TemplateLoader.Fill("status", new Dictionary<string, string>
        {
            ["TITLE"] = "{{HEADING}}",
            ["HEADING"] = "real-heading",
            ["MESSAGE"] = string.Empty,
            ["SPINNER"] = string.Empty,
            ["BUTTON"] = string.Empty,
            ["CONTENT"] = string.Empty
        });

        Assert.Contains("{{HEADING}}", html, System.StringComparison.Ordinal);
        Assert.Contains("real-heading", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// A token with no value is left in the output as written.
    /// True: a missing value is visible in the page.
    /// False: the token would vanish or throw.
    /// </summary>
    [Fact]
    public void Fill_LeavesAnUnknownTokenAsWritten()
    {
        var html = TemplateLoader.Fill("status", new Dictionary<string, string>());

        Assert.Contains("{{HEADING}}", html, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// An unknown template name throws, and an empty name or a missing value map is rejected.
    /// True: a typo in a template name fails at once with the name in the message.
    /// False: a missing template would give an empty page.
    /// </summary>
    [Fact]
    public void Load_RejectsUnknownAndEmptyNames()
    {
        var unknown = Assert.Throws<System.InvalidOperationException>(() => TemplateLoader.Load("no-such-template"));

        Assert.Contains("no-such-template", unknown.Message, System.StringComparison.Ordinal);
        Assert.Throws<System.ArgumentException>(() => TemplateLoader.Load(string.Empty));
        Assert.Throws<System.ArgumentNullException>(() => TemplateLoader.Fill("status", null!));
    }
}
