using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// A config-page dropdown must show exactly one chevron.
/// </summary>
/// <remarks>
/// Two things want to draw it. The kit paints its own on <c>.pluginConfigurationPage select</c>,
/// and jellyfin-web's emby-select injects a <c>.selectArrowContainer</c> holding a Material
/// keyboard_arrow_down — but only for selects carrying <c>emby-select-withcolor</c>, which is the
/// class the dashboard's own settings pages use and which therefore gets copied into plugins.
/// When both apply the field renders two overlapping arrows. Four plugins shipped that way before
/// the kit started suppressing the injected one, so both halves of the invariant are pinned here.
/// </remarks>
public class SelectChevronTests
{
    // form.css scopes its rules to config pages and to kit dialogs, which open outside the page. The two are written as
    // a plain selector list (older engines can't parse :is()), so each rule must name both.
    private const string Scope = @"(?:\.pluginConfigurationPage|\.jpk-dialog)";

    private static readonly string[] Scopes = { ".pluginConfigurationPage", ".jpk-dialog" };

    [Fact]
    public void TableFilterArrow_IsHiddenOnConfigPagesAndInDialogs()
    {
        var css = KitCss(".Css.table.css");

        foreach (var scope in Scopes)
        {
            var body = CssRules.BodyFor(css, scope + " .jpk-table-filter-arrow");
            Assert.True(body != null, "table.css must hide .jpk-table-filter-arrow under " + scope + ", where the select rule already paints a chevron.");
            Assert.Matches(new Regex(@"display\s*:\s*none"), body);
        }
    }

    [Fact]
    public void Kit_PaintsAChevronOnConfigPageSelects()
    {
        var css = FormCss();

        foreach (var scope in Scopes)
        {
            var body = CssRules.BodyFor(css, scope + " select");
            Assert.True(body != null, "form.css must style " + scope + " select.");
            Assert.Matches(new Regex(@"background-image\s*:"), body);
        }
    }

    [Fact]
    public void Kit_SuppressesTheArrowEmbySelectInjects()
    {
        var css = FormCss();

        foreach (var scope in Scopes)
        {
            var body = CssRules.BodyFor(css, scope + " .selectArrowContainer");
            Assert.True(body != null, "form.css must neutralize .selectArrowContainer under " + scope + ", or emby-select-withcolor dropdowns render two chevrons.");
            Assert.Matches(new Regex(@"display\s*:\s*none\s*!important"), body);
        }
    }

    /// <summary>
    /// The suppression has to outrank jellyfin-web's own <c>.selectArrowContainer</c> rules, which
    /// are element-scoped and load from the dashboard rather than from this kit.
    /// </summary>
    [Fact]
    public void Suppression_IsScopedToConfigPagesOnly()
    {
        var css = FormCss();

        Assert.DoesNotMatch(
            new Regex(@"(^|[^.\w-])\.selectArrowContainer\s*\{", RegexOptions.Multiline),
            Regex.Replace(css, Scope + @"\s+\.selectArrowContainer", "SCOPED"));
    }

    private static string FormCss() => KitCss(".Css.form.css");

    private static string KitCss(string suffix)
    {
        var asm = typeof(SelectChevronTests).Assembly;
        var name = asm.GetManifestResourceNames()
            .Single(n => n.EndsWith(suffix, StringComparison.Ordinal));

        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
