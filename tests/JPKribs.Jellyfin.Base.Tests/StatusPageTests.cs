using JPKribs.Jellyfin.Base;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Tests for <see cref="StatusPage"/> rendering and the shared <c>status</c> card template.</summary>
public class StatusPageTests
{
    [Fact]
    public void Render_FillsHeadingAndMessage_AndLeavesNoTokens()
    {
        var html = StatusPage.Render("Sign in required", "Please sign in.");

        Assert.Contains("Sign in required", html, System.StringComparison.Ordinal);
        Assert.Contains("Please sign in.", html, System.StringComparison.Ordinal);
        Assert.Contains("jpk-card", html, System.StringComparison.Ordinal);
        // CONTENT defaults to empty, so the slot must not leak as a literal token.
        Assert.DoesNotContain("{{", html, System.StringComparison.Ordinal);
    }

    [Fact]
    public void Render_EncodesHtml()
    {
        var html = StatusPage.Render("<b>x</b>", "a & b");
        Assert.Contains("&lt;b&gt;x&lt;/b&gt;", html, System.StringComparison.Ordinal);
        Assert.Contains("a &amp; b", html, System.StringComparison.Ordinal);
    }

    [Fact]
    public void Render_SpinnerAndButtonAreOptional()
    {
        // Assert on the elements, not the class names (the template's <style> always defines the classes).
        var withButton = StatusPage.Render("H", "M", buttonText: "Back", buttonHref: "../web/", showSpinner: true);
        Assert.Contains("<div class=\"jpk-spinner\"", withButton, System.StringComparison.Ordinal);
        Assert.Contains("<a class=\"jpk-btn\"", withButton, System.StringComparison.Ordinal);
        Assert.Contains("../web/", withButton, System.StringComparison.Ordinal);

        var noButton = StatusPage.Render("H", "M", buttonText: null, buttonHref: null);
        Assert.DoesNotContain("<a class=\"jpk-btn\"", noButton, System.StringComparison.Ordinal);
        Assert.DoesNotContain("<div class=\"jpk-spinner\"", noButton, System.StringComparison.Ordinal);
    }

    /// <summary>
    /// Regression guards for the shared card template. These caught real shipped breakages: a missing
    /// <c>.hidden</c> rule (stacked multi-state shells) and a missing tab favicon link.
    /// </summary>
    [Theory]
    [InlineData(".hidden{display:none}")]
    [InlineData("{{CONTENT}}")]
    [InlineData("rel=\"icon\"")]
    [InlineData("{{TITLE}}")]
    [InlineData("{{HEADING}}")]
    [InlineData("{{MESSAGE}}")]
    [InlineData("{{SPINNER}}")]
    [InlineData("{{BUTTON}}")]
    [InlineData("jpk-logo")]
    public void StatusTemplate_ContainsRequiredMarkup(string needle)
    {
        Assert.Contains(needle, TemplateLoader.Load("status"), System.StringComparison.Ordinal);
    }
}
