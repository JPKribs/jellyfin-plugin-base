using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using JPKribs.Jellyfin.Base;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// The <c>status</c> card is self contained and is frequently rendered on a page that also links the kit
/// CSS (e.g. a plugin that uses the searchable combo). Any class defined by BOTH the card template and the
/// kit CSS lets the kit rules clobber the card. This shipped twice (<c>.jpk-card</c>, <c>.jpk-edit-input</c>)
/// and broke modals, so the invariant is enforced here.
/// </summary>
public class CssCollisionTests
{
    // .hidden is intentionally shared and identical (display:none) in both, so it never conflicts.
    private static readonly HashSet<string> Allowed = new(StringComparer.Ordinal) { "hidden" };

    [Fact]
    public void StatusTemplateClasses_DoNotCollideWithKitCss()
    {
        var statusClasses = ExtractClasses(StatusStyleBlock());
        var kitClasses = KitClasses();

        var collisions = statusClasses.Intersect(kitClasses).Where(c => !Allowed.Contains(c)).OrderBy(c => c, StringComparer.Ordinal).ToList();

        Assert.True(
            collisions.Count == 0,
            "status.html shares CSS classes with the kit (the kit will clobber the card): " + string.Join(", ", collisions));
    }

    private static string StatusStyleBlock()
    {
        var html = TemplateLoader.Load("status");
        var match = Regex.Match(html, "<style>(.*?)</style>", RegexOptions.Singleline);
        return match.Success ? match.Groups[1].Value : html;
    }

    private static HashSet<string> KitClasses()
    {
        var asm = typeof(CssCollisionTests).Assembly;
        var classes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var name in asm.GetManifestResourceNames().Where(n => n.Contains(".Css.", StringComparison.Ordinal) && n.EndsWith(".css", StringComparison.Ordinal)))
        {
            using var stream = asm.GetManifestResourceStream(name)!;
            using var reader = new StreamReader(stream);
            classes.UnionWith(ExtractClasses(reader.ReadToEnd()));
        }

        Assert.NotEmpty(classes); // guard: the css must actually be embedded
        return classes;
    }

    private static HashSet<string> ExtractClasses(string css)
    {
        var set = new HashSet<string>(StringComparer.Ordinal);
        foreach (Match m in Regex.Matches(css, @"\.([a-zA-Z][\w-]*)"))
        {
            set.Add(m.Groups[1].Value);
        }

        return set;
    }
}
