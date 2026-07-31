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
    [Fact]
    public void Kit_PaintsAChevronOnConfigPageSelects()
    {
        var css = FormCss();

        Assert.Matches(new Regex(@"\.pluginConfigurationPage\s+select\s*\{[^}]*background-image\s*:", RegexOptions.Singleline), css);
    }

    [Fact]
    public void Kit_SuppressesTheArrowEmbySelectInjects()
    {
        var css = FormCss();

        var rule = Regex.Match(
            css,
            @"\.pluginConfigurationPage\s+\.selectArrowContainer\s*\{(?<body>[^}]*)\}",
            RegexOptions.Singleline);

        Assert.True(rule.Success, "form.css must neutralize .selectArrowContainer, or emby-select-withcolor dropdowns render two chevrons.");
        Assert.Matches(new Regex(@"display\s*:\s*none\s*!important"), rule.Groups["body"].Value);
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
            css.Replace(".pluginConfigurationPage .selectArrowContainer", "SCOPED", StringComparison.Ordinal));
    }

    private static string FormCss()
    {
        var asm = typeof(SelectChevronTests).Assembly;
        var name = asm.GetManifestResourceNames()
            .Single(n => n.EndsWith(".Css.form.css", StringComparison.Ordinal));

        using var stream = asm.GetManifestResourceStream(name)!;
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
