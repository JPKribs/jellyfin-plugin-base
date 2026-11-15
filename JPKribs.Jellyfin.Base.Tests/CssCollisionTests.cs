using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that the self contained <c>status</c> card template shares no class with the kit CSS, since the kit rules would restyle the card.</summary>
public class CssCollisionTests
{
    // The hidden class is shared on purpose and is the same rule in both, so it never conflicts.
    private static readonly HashSet<string> Allowed = new(StringComparer.Ordinal) { "hidden" };

    /// <summary>
    /// No class defined by the status template is also defined by the kit CSS, other than hidden.
    /// True: a page that links the kit CSS beside a status card keeps the card's look.
    /// False: the kit rules would restyle the card.
    /// </summary>
    [Fact]
    public void StatusTemplateClasses_DoNotCollideWithKitCss()
    {
        var statusClasses = ExtractClasses(StatusStyleBlock());
        var kitClasses = KitClasses();

        var collisions = statusClasses.Intersect(kitClasses).Where(c => !Allowed.Contains(c)).OrderBy(c => c, StringComparer.Ordinal).ToList();

        Assert.True(
            collisions.Count == 0,
            "status.html shares CSS classes with the kit, so the kit would restyle the card: " + string.Join(", ", collisions));
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

        Assert.NotEmpty(classes);
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
