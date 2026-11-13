using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// The kit's CSS must keep working on older engines: the desktop app's Qt WebEngine (Chromium 87 or 108) and older TV
/// webviews have neither color-mix() nor, on the oldest, :is(). An engine drops a declaration it can't parse and keeps
/// the one before it, but a value that uses var() is accepted when parsed and only fails when used, wiping whatever came
/// before. So a color-mix() of currentColor needs a plain colour on the line before it, and a color-mix() of a variable
/// (or a token holding one) has to sit in an @supports block after a plain rule.
/// </summary>
public class CssFallbackTests
{
    private const string WhiteWash = "rgba(255, 255, 255";
    private const string DefaultAccent = "rgba(0, 164, 220";
    private static readonly string[] Scopes = { ".pluginConfigurationPage", ".jpk-dialog" };
    private static readonly string[] FieldContainers = { ".inputContainer", ".selectContainer", ".checkboxContainer" };

    [Fact]
    public void EveryColorMix_HasAPlainFallback()
    {
        var problems = new List<string>();
        foreach (var rule in AllRules())
        {
            for (var i = 0; i < rule.Declarations.Count; i++)
            {
                var decl = rule.Declarations[i];
                if (!decl.Value.Contains("color-mix(", StringComparison.Ordinal) || decl.Property.StartsWith("--", StringComparison.Ordinal))
                {
                    continue;
                }

                if (rule.InColorMixSupports)
                {
                    continue;
                }

                if (decl.Value.Contains("var(", StringComparison.Ordinal))
                {
                    problems.Add(Where(rule, decl) + " mixes a variable outside @supports, which wipes its fallback on older engines");
                    continue;
                }

                var previous = i > 0 ? rule.Declarations[i - 1] : null;
                if (previous == null || previous.Property != decl.Property || previous.Value.Contains("color-mix(", StringComparison.Ordinal))
                {
                    problems.Add(Where(rule, decl) + " has no plain " + decl.Property + " on the line before it");
                }
            }
        }

        Assert.True(problems.Count == 0, string.Join(Environment.NewLine, problems));
    }

    [Theory]
    [InlineData(WhiteWash)]
    [InlineData(DefaultAccent)]
    public void HardCodedColours_AreOnlyFallbacks(string colour)
    {
        var rules = AllRules();
        var problems = new List<string>();
        foreach (var rule in rules)
        {
            for (var i = 0; i < rule.Declarations.Count; i++)
            {
                var decl = rule.Declarations[i];
                if (!decl.Value.Contains(colour, StringComparison.Ordinal) || decl.Property.StartsWith("--", StringComparison.Ordinal))
                {
                    continue;
                }

                var next = i + 1 < rule.Declarations.Count ? rule.Declarations[i + 1] : null;
                var upgradedInline = next != null && next.Property == decl.Property && next.Value.Contains("color-mix(", StringComparison.Ordinal);
                var upgradedInSupports = rules.Any(r => r.InColorMixSupports
                    && r.Selectors.Intersect(rule.Selectors).Any()
                    && r.Declarations.Any(d => (d.Property == decl.Property || d.Property.StartsWith(decl.Property + "-", StringComparison.Ordinal))
                        && d.Value.Contains("color-mix(", StringComparison.Ordinal)));
                if (!upgradedInline && !upgradedInSupports)
                {
                    problems.Add(Where(rule, decl) + " is hard coded rather than a fallback for a themed color-mix()");
                }
            }
        }

        Assert.True(problems.Count == 0, string.Join(Environment.NewLine, problems));
    }

    [Theory]
    [InlineData("--jpk-border")]
    [InlineData("--jpk-accent-hover")]
    public void ColorMixTokens_StartOnAPlainColour(string token)
    {
        var rules = CssRules.Parse(Source("tokens.css"));

        var plain = rules.Where(r => !r.InColorMixSupports && r.Selectors.Contains(":root"))
            .SelectMany(r => r.Declarations).FirstOrDefault(d => d.Property == token);
        Assert.True(plain != null, token + " must be declared on :root outside @supports.");
        Assert.DoesNotContain("color-mix(", plain!.Value, StringComparison.Ordinal);

        var upgrade = rules.Where(r => r.InColorMixSupports && r.Selectors.Contains(":root"))
            .SelectMany(r => r.Declarations).FirstOrDefault(d => d.Property == token);
        Assert.True(upgrade != null, token + " must be upgraded to color-mix() inside @supports.");
        Assert.Contains("color-mix(", upgrade!.Value, StringComparison.Ordinal);
    }

    [Fact]
    public void ForegroundToken_FallsBackToWhite()
    {
        var root = CssRules.Parse(Source("tokens.css")).Where(r => !r.InColorMixSupports && r.Selectors.Contains(":root"))
            .SelectMany(r => r.Declarations).FirstOrDefault(d => d.Property == "--jpk-fg");

        Assert.True(root != null, "--jpk-fg must be declared on :root.");
        Assert.Matches(new Regex(@"^var\(--jf-palette-text-primary,\s*#fff\)$"), root!.Value);
    }

    [Fact]
    public void FormCss_DoesNotUseIs()
    {
        Assert.DoesNotContain(":is(", Source("form.css"), StringComparison.Ordinal);
    }

    /// <summary>
    /// An engine without :has() drops the whole rule, so a :has() selector must never share a rule with one the older
    /// engine needs (the .selected choice shipped that way).
    /// </summary>
    [Fact]
    public void HasSelectors_StandAlone()
    {
        var mixed = AllRules()
            .Where(r => r.Selectors.Count > 1 && r.Selectors.Any(s => s.Contains(":has(", StringComparison.Ordinal)))
            .Select(r => r.File + ": " + string.Join(", ", r.Selectors))
            .ToList();

        Assert.True(mixed.Count == 0, string.Join(Environment.NewLine, mixed));
    }

    /// <summary>
    /// Buttons and kit blocks inside a field container lose their own margins, as they did before the reset was narrowed
    /// (a selector or table in an inputContainer, a notice in a selectContainer, Clear buttons beside an input).
    /// </summary>
    [Fact]
    public void FieldContainerChildReset_CoversButtonsAndKitBlocks()
    {
        var rules = CssRules.Parse(Source("form.css"));
        foreach (var scope in Scopes)
        {
            foreach (var container in FieldContainers)
            {
                foreach (var child in new[] { "button", "label", "input", "[class^=\"jpk-\"]", "[class*=\" jpk-\"]" })
                {
                    var selector = scope + " " + container + " > " + child;
                    var rule = rules.FirstOrDefault(r => r.Selectors.Contains(selector));
                    Assert.True(rule != null, "form.css must reset the margin of " + selector);
                    Assert.Contains(rule!.Declarations, d => d.Property == "margin" && d.Value == "0 !important");
                }

                // A caller's own content without a kit class keeps its spacing: no blanket child reset.
                Assert.DoesNotContain(rules, r => r.Selectors.Contains(scope + " " + container + " > *"));
            }
        }
    }

    [Fact]
    public void FieldContainerLastChild_AddsNoSpaceBelow()
    {
        var rules = CssRules.Parse(Source("form.css"));
        foreach (var scope in Scopes)
        {
            foreach (var container in FieldContainers)
            {
                var rule = rules.FirstOrDefault(r => r.Selectors.Any(s => s.StartsWith(scope + " " + container + " > :last-child", StringComparison.Ordinal)));
                Assert.True(rule != null, "form.css must reset the bottom margin of the last child in " + scope + " " + container);
                Assert.Contains(rule!.Declarations, d => d.Property == "margin-bottom" && d.Value == "0 !important");
            }
        }
    }

    private static List<CssRules.Rule> AllRules()
    {
        var sources = CssRules.KitSources();
        Assert.NotEmpty(sources);
        return sources.SelectMany(kv => CssRules.Parse(kv.Value, kv.Key)).ToList();
    }

    private static string Source(string file)
    {
        var sources = CssRules.KitSources();
        Assert.True(sources.ContainsKey(file), file + " must be embedded in the test assembly.");
        return sources[file];
    }

    private static string Where(CssRules.Rule rule, CssRules.Declaration decl) =>
        rule.File + ": " + string.Join(", ", rule.Selectors) + " { " + decl.Property + ": " + decl.Value + " }";
}
