using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that a config page dropdown shows exactly one chevron.</summary>
/// <remarks>
/// Two things draw it. The kit paints its own on <c>.pluginConfigurationPage select</c>, and jellyfin-web's emby-select injects a <c>.selectArrowContainer</c> holding a Material arrow.
/// It does so only for selects with <c>emby-select-withcolor</c>, the class the dashboard's own settings pages use, which plugins copy.
/// When both apply the field renders two overlapping arrows, so both halves of the invariant are pinned here.
/// </remarks>
public class SelectChevronTests
{
    // The form CSS scopes its rules to config pages and to kit dialogs, which open outside the page.
    // The two are written as a plain selector list, since older engines cannot parse :is(), so each rule names both.
    private const string Scope = @"(?:\.pluginConfigurationPage|\.base-dialog)";

    private static readonly string[] Scopes = { ".pluginConfigurationPage", ".base-dialog" };

    /// <summary>
    /// The form CSS paints a background image chevron on selects in config pages and dialogs.
    /// True: every dropdown shows one chevron.
    /// False: a dropdown would show none.
    /// </summary>
    [Fact]
    public void Kit_PaintsAChevronOnConfigPageSelects()
    {
        var css = FormCss();

        foreach (var scope in Scopes)
        {
            var body = CssRules.BodyFor(css, scope + " select");
            Assert.True(body != null, "form-fields.css must style " + scope + " select.");
            Assert.Matches(new Regex(@"background-image\s*:"), body);
        }
    }

    /// <summary>
    /// The form CSS hides the arrow container that emby-select injects, in config pages and dialogs.
    /// True: a select with emby-select-withcolor shows one chevron.
    /// False: it would show two.
    /// </summary>
    [Fact]
    public void Kit_SuppressesTheArrowEmbySelectInjects()
    {
        var css = FormCss();

        foreach (var scope in Scopes)
        {
            var body = CssRules.BodyFor(css, scope + " .selectArrowContainer");
            Assert.True(body != null, "form-fields.css must neutralize .selectArrowContainer under " + scope + ", or emby-select-withcolor dropdowns render two chevrons.");
            Assert.Matches(new Regex(@"display\s*:\s*none\s*!important"), body);
        }
    }

    /// <summary>
    /// The suppression is scoped to config pages and dialogs and never applies to the whole document.
    /// True: dropdowns outside a config page keep their own arrow.
    /// False: the rule would hide the arrow on every page of the dashboard.
    /// </summary>
    [Fact]
    public void Suppression_IsScopedToConfigPagesOnly()
    {
        var css = FormCss();

        Assert.DoesNotMatch(
            new Regex(@"(^|[^.\w-])\.selectArrowContainer\s*\{", RegexOptions.Multiline),
            Regex.Replace(css, Scope + @"\s+\.selectArrowContainer", "SCOPED"));
    }

    /// <summary>
    /// The rule that fixes a single line field's height also removes its padding above and below the text, over Jellyfin's select style.
    /// True: a select's text has the whole field height, so letters such as y and g are never clipped.
    /// False: Jellyfin's padding would leave less room than the text needs inside the fixed height.
    /// </summary>
    [Fact]
    public void Kit_FixedHeightFieldsHaveNoVerticalPadding()
    {
        var rules = CssRules.Parse(FormCss());

        foreach (var scope in Scopes)
        {
            foreach (var field in new[] { " select", " input[type=\"text\"]", " input[type=\"number\"]" })
            {
                var rule = rules.FirstOrDefault(r => r.Selectors.Contains(scope + field) && r.Declarations.Any(d => d.Property == "height" && d.Value.Contains("--base-field-height", StringComparison.Ordinal)));
                Assert.True(rule != null, "form-fields.css must fix the height of " + scope + field + ".");
                Assert.Contains(rule!.Declarations, d => d.Property == "padding-top" && d.Value == "0 !important");
                Assert.Contains(rule.Declarations, d => d.Property == "padding-bottom" && d.Value == "0 !important");
            }
        }
    }

    private static string FormCss() => KitCss(".Css.form-fields.css");

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
