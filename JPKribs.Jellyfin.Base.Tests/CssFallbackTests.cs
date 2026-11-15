using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that the kit's CSS keeps a plain fallback for every color-mix() and avoids :is() so older engines still render it.</summary>
/// <remarks>
/// The desktop app's Qt WebEngine and older TV webviews have neither color-mix() nor, on the oldest, :is().
/// An engine drops a declaration it cannot parse and keeps the one before it, but a value that uses var() is accepted when parsed and fails only when used, which wipes whatever came before.
/// So a color-mix() of currentColor needs a plain color on the line before it, and a color-mix() of a variable has to sit in an @supports block after a plain rule.
/// </remarks>
public class CssFallbackTests
{
    private const string WhiteWash = "rgba(255, 255, 255";
    private const string DefaultAccent = "rgba(0, 164, 220";
    private static readonly string[] Scopes = { ".pluginConfigurationPage", ".jpk-dialog" };
    private static readonly string[] FieldContainers = { ".inputContainer", ".selectContainer", ".checkboxContainer" };

    /// <summary>
    /// Every color-mix() outside an @supports block has a plain value of the same property just before it, and none mixes a variable.
    /// True: an older engine keeps the plain color.
    /// False: an older engine would drop the declaration or wipe the fallback.
    /// </summary>
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

    /// <summary>
    /// A hard coded white wash or default accent color appears only as the fallback for a color-mix().
    /// True: themed colors follow the Jellyfin palette.
    /// False: a fixed color would ignore the theme.
    /// </summary>
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

    /// <summary>
    /// A token that holds a color-mix() is declared as a plain color on :root and upgraded inside an @supports block.
    /// True: an older engine reads the plain color.
    /// False: an older engine would read a value it cannot parse.
    /// </summary>
    [Theory]
    [InlineData("--jpk-border")]
    [InlineData("--jpk-accent-hover")]
    [InlineData("--jpk-wash")]
    [InlineData("--jpk-wash-strong")]
    [InlineData("--jpk-accent-wash")]
    public void ColorMixTokens_StartOnAPlainColour(string token)
    {
        var rules = CssRules.Parse(Source("tokens.css"));

        var plain = rules.Where(r => !r.InColorMixSupports && r.Selectors.Contains(":root"))
            .SelectMany(r => r.Declarations).FirstOrDefault(d => d.Property == token);
        Assert.True(plain != null, token + " must be declared on :root outside @supports.");
        Assert.DoesNotContain("color-mix(", plain!.Value, StringComparison.Ordinal);
        if (token.Contains("wash", StringComparison.Ordinal))
        {
            Assert.StartsWith("rgba(", plain.Value, StringComparison.Ordinal);
        }

        var upgrade = rules.Where(r => r.InColorMixSupports && r.Selectors.Contains(":root"))
            .SelectMany(r => r.Declarations).FirstOrDefault(d => d.Property == token);
        Assert.True(upgrade != null, token + " must be upgraded to color-mix() inside @supports.");
        Assert.Contains("color-mix(", upgrade!.Value, StringComparison.Ordinal);
    }

    /// <summary>
    /// The foreground token reads the Jellyfin text color and falls back to white.
    /// True: text stays readable on a dark page without the palette.
    /// False: the text color would be unset.
    /// </summary>
    [Fact]
    public void ForegroundToken_FallsBackToWhite()
    {
        var root = CssRules.Parse(Source("tokens.css")).Where(r => !r.InColorMixSupports && r.Selectors.Contains(":root"))
            .SelectMany(r => r.Declarations).FirstOrDefault(d => d.Property == "--jpk-fg");

        Assert.True(root != null, "--jpk-fg must be declared on :root.");
        Assert.Matches(new Regex(@"^var\(--jf-palette-text-primary,\s*#fff\)$"), root!.Value);
    }

    /// <summary>
    /// The form CSS does not use :is().
    /// True: the oldest engines parse every form rule.
    /// False: an engine without :is() would drop the whole rule.
    /// </summary>
    [Fact]
    public void FormCss_DoesNotUseIs()
    {
        Assert.DoesNotContain(":is(", Source("form.css"), StringComparison.Ordinal);
    }

    /// <summary>
    /// No rule lists a :has() selector beside another selector.
    /// True: an engine without :has() drops only the :has() rule.
    /// False: it would drop the whole rule, including selectors it can read.
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
    /// The form CSS resets the margin of buttons, labels, inputs, and kit blocks inside each field container, and not of every child.
    /// True: a button or kit block beside an input adds no stray space and a caller's own content keeps its spacing.
    /// False: stray margins would appear or a blanket reset would remove spacing a caller chose.
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

                // A caller's own content without a kit class keeps its spacing, so there is no blanket child reset.
                Assert.DoesNotContain(rules, r => r.Selectors.Contains(scope + " " + container + " > *"));
            }
        }
    }

    /// <summary>
    /// The last child of each field container has no bottom margin.
    /// True: a field adds no space below its last child.
    /// False: fields would be spaced unevenly.
    /// </summary>
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

    /// <summary>
    /// The wash tokens start as a plain rgba() in the first :root block and become color-mix() only inside the @supports block.
    /// True: an older engine reads a plain color and a newer one reads the themed mix.
    /// False: an older engine would read a value it cannot parse and wipe the wash.
    /// </summary>
    [Theory]
    [InlineData("--jpk-accent-wash")]
    [InlineData("--jpk-wash")]
    [InlineData("--jpk-wash-strong")]
    public void WashTokens_StartPlainAndUpgradeInSupports(string token)
    {
        var rules = CssRules.Parse(Source("tokens.css"));

        var firstRoot = rules.First(r => r.Selectors.Contains(":root"));
        Assert.False(firstRoot.InColorMixSupports);
        var plain = firstRoot.Declarations.FirstOrDefault(d => d.Property == token);
        Assert.True(plain != null, token + " must be declared in the first :root block.");
        Assert.StartsWith("rgba(", plain!.Value, StringComparison.Ordinal);

        var upgrades = rules.Where(r => r.InColorMixSupports && r.Selectors.Contains(":root"))
            .SelectMany(r => r.Declarations).Where(d => d.Property == token).ToList();
        Assert.Single(upgrades);
        Assert.StartsWith("color-mix(", upgrades[0].Value, StringComparison.Ordinal);
        Assert.Equal(1, rules.Where(r => !r.InColorMixSupports).SelectMany(r => r.Declarations).Count(d => d.Property == token));
    }

    /// <summary>
    /// The text color on an accent fill is exactly white and is never redefined inside @supports.
    /// True: text on an accent or status fill stays white in every theme.
    /// False: a themed value would make the text follow the page and vanish on the fill.
    /// </summary>
    [Fact]
    public void OnAccentToken_IsWhiteAndNeverInSupports()
    {
        var rules = CssRules.Parse(Source("tokens.css"));

        var declarations = rules.SelectMany(r => r.Declarations.Select(d => (Rule: r, Declaration: d)))
            .Where(x => x.Declaration.Property == "--jpk-on-accent").ToList();

        var only = Assert.Single(declarations);
        Assert.Equal("#fff", only.Declaration.Value);
        Assert.False(only.Rule.InColorMixSupports);
    }

    /// <summary>
    /// The progress fill on a submit or destructive button has a plain rgba() rule before an @supports block that mixes the on-accent token.
    /// True: the fill is visible on an older engine and follows the token on a newer one.
    /// False: an older engine would drop the fill, or a mixed variable would wipe the plain color.
    /// </summary>
    [Theory]
    [InlineData(".jpk-button-submit .jpk-btn-progress")]
    [InlineData(".jpk-button-destructive .jpk-btn-progress")]
    public void ButtonProgress_HasAPlainRuleBeforeTheSupportsUpgrade(string selector)
    {
        var rules = CssRules.Parse(Source("button-progress.css"), "button-progress.css");

        var plain = rules.FindIndex(r => !r.InColorMixSupports && r.Selectors.Contains(selector) && r.Declarations.Any(d => d.Property == "background" && d.Value.StartsWith("rgba(", StringComparison.Ordinal)));
        var upgrade = rules.FindIndex(r => r.InColorMixSupports && r.Selectors.Contains(selector)
            && r.Declarations.Any(d => d.Property == "background" && d.Value == "color-mix(in srgb, var(--jpk-on-accent) 70%, transparent)"));

        Assert.True(plain >= 0, selector + " needs a plain rgba() background.");
        Assert.True(upgrade > plain, selector + " needs the color-mix() upgrade inside @supports after the plain rule.");
    }

    /// <summary>
    /// The pill tag's remove control and its hover each pair an rgba() with a color-mix() of currentColor right after it.
    /// True: an older engine keeps the plain wash and a newer one follows the text color.
    /// False: the remove control would lose its background on an older engine.
    /// </summary>
    [Theory]
    [InlineData(".jpk-tag-pill .jpk-tag-remove")]
    [InlineData(".jpk-tag-pill .jpk-tag-remove:hover")]
    public void PillTagRemove_PairsRgbaWithColorMix(string selector)
    {
        var rules = CssRules.Parse(Source("tags.css"), "tags.css").Where(r => r.Selectors.Contains(selector)).ToList();

        Assert.NotEmpty(rules);
        var paired = rules.Any(r => r.Declarations.Select((d, i) => (d, i)).Any(x =>
            x.d.Property == "background"
            && x.d.Value.StartsWith("rgba(", StringComparison.Ordinal)
            && x.i + 1 < r.Declarations.Count
            && r.Declarations[x.i + 1].Property == "background"
            && r.Declarations[x.i + 1].Value.StartsWith("color-mix(", StringComparison.Ordinal)
            && r.Declarations[x.i + 1].Value.Contains("currentColor", StringComparison.Ordinal)));
        Assert.True(paired, selector + " needs an rgba() background followed by a color-mix() of currentColor.");
    }

    /// <summary>
    /// No CSS file other than tokens.css writes white as a color.
    /// True: white comes from the on-accent token, so one edit changes it everywhere.
    /// False: a file would hard code white and drift from the token.
    /// </summary>
    [Fact]
    public void White_IsWrittenOnlyInTheTokens()
    {
        var white = new Regex(@"#fff(fff)?\b|\bwhite\b", RegexOptions.IgnoreCase);
        var problems = CssRules.KitSources()
            .Where(kv => kv.Key != "tokens.css")
            .SelectMany(kv => CssRules.Parse(kv.Value, kv.Key))
            .SelectMany(r => r.Declarations.Where(d => white.IsMatch(d.Value)).Select(d => Where(r, d)))
            .ToList();

        Assert.True(problems.Count == 0, string.Join(Environment.NewLine, problems));
    }

    /// <summary>
    /// A selected table row is tinted with the accent wash and the rule comes after the hover rule.
    /// True: a selected row keeps its tint while the pointer is over it.
    /// False: the hover color would win and hide the selection.
    /// </summary>
    [Fact]
    public void SelectedTableRow_UsesTheAccentWashAfterHover()
    {
        var rules = CssRules.Parse(Source("table.css"), "table.css");

        var hover = rules.FindIndex(r => r.Selectors.Contains(".jpk-table-row:hover"));
        var selected = rules.FindIndex(r => r.Selectors.Contains(".jpk-table-row.selected"));

        Assert.True(hover >= 0, "table.css must have a row hover rule.");
        Assert.True(selected > hover, "The selected row rule must come after the hover rule.");
        Assert.Contains(rules[selected].Declarations, d => d.Property == "background" && d.Value == "var(--jpk-accent-wash)");
    }

    /// <summary>
    /// The date input in a field container has its own field look and focus rules in the page and dialog scopes, as plain selectors, and a compact date input outside a container keeps its own look.
    /// True: a date field in an inputContainer looks like the other fields on every engine, and an inline edit input is not touched.
    /// False: a date field would look different, an :is() would hide it from older engines, or the rule would restyle an inline edit input.
    /// </summary>
    [Fact]
    public void DateInput_IsInTheFieldLookAndFocusLists()
    {
        var rules = CssRules.Parse(Source("form.css"), "form.css");

        foreach (var scope in new[] { ".pluginConfigurationPage", ".jpk-dialog" })
        {
            foreach (var selector in new[] { scope + " .inputContainer input[type=\"date\"]", scope + " .inputContainer input[type=\"date\"]:focus" })
            {
                var rule = rules.FirstOrDefault(r => r.Selectors.Contains(selector));
                Assert.True(rule != null, "form.css must list " + selector);
                Assert.DoesNotContain(rule!.Selectors, x => x.Contains(":is(", StringComparison.Ordinal));
                Assert.DoesNotContain(rule.Selectors, x => x.Contains(".jpk-edit-input", StringComparison.Ordinal));
            }
        }
    }

    /// <summary>
    /// Every badge state name has a status badge rule and every badge color has a badge rule.
    /// True: a plugin that maps a status onto a name or color always gets a tint.
    /// False: a name or color in the list would render untinted.
    /// </summary>
    [Fact]
    public void BadgeStates_HaveRules()
    {
        var core = File.ReadAllText(Path.Combine(RepositoryRoot(), "src", "js", "core.js"));
        var names = ReadList(core, "names");
        var colors = ReadList(core, "colors");
        var selectors = CssRules.Parse(Source("badges.css")).SelectMany(r => r.Selectors).ToHashSet(StringComparer.Ordinal);

        Assert.NotEmpty(names);
        Assert.NotEmpty(colors);
        var missing = names.Select(n => ".jpk-table-status-badge." + n).Concat(colors.Select(c => ".jpk-badge." + c))
            .Where(s => !selectors.Contains(s)).ToList();
        Assert.True(missing.Count == 0, "No badge rule for " + string.Join(", ", missing));
    }

    private static List<string> ReadList(string source, string key)
    {
        var block = Regex.Match(source, @"export var BADGE_STATES = \{.*?\};", RegexOptions.Singleline).Value;
        var list = Regex.Match(block, key + @"\s*:\s*\[(.*?)\]", RegexOptions.Singleline).Groups[1].Value;
        return Regex.Matches(list, @"'([^']+)'").Select(m => m.Groups[1].Value).ToList();
    }

    private static string RepositoryRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "src", "js", "core.js")))
        {
            dir = dir.Parent;
        }

        Assert.True(dir != null, "The repository root with src/js/core.js was not found above the test output.");
        return dir!.FullName;
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
