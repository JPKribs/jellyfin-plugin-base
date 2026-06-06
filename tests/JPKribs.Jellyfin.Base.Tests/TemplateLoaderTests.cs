using System.Collections.Generic;
using JPKribs.Jellyfin.Base;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for <see cref="TemplateLoader"/> load and single-pass token fill.</summary>
public class TemplateLoaderTests
{
    [Fact]
    public void Load_ReturnsEmbeddedTemplate()
    {
        var html = TemplateLoader.Load("status");
        Assert.Contains("jpk-status-card", html, System.StringComparison.Ordinal);
    }

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

    [Fact]
    public void Fill_IsSinglePass_SubstitutedValuesAreNotRescanned()
    {
        // A value that looks like another token must not be expanded again.
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
}
