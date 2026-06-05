using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Loads and fills HTML templates from the package's <c>templates/</c> folder, which are embedded into
/// the consuming plugin's assembly at build time. Templates are cached after first read.
/// </summary>
public static partial class TemplateLoader
{
    private static readonly ConcurrentDictionary<string, string> Cache = new(StringComparer.Ordinal);

    /// <summary>
    /// Loads a template by name (the file name without the <c>.html</c> extension).
    /// </summary>
    /// <param name="name">The template name, e.g. <c>status</c>.</param>
    /// <returns>The raw template text.</returns>
    public static string Load(string name)
    {
        ArgumentException.ThrowIfNullOrEmpty(name);
        return Cache.GetOrAdd(name, static key =>
        {
            var assembly = typeof(TemplateLoader).Assembly;
            var suffix = ".Templates." + key + ".html";
            var resourceName = Array.Find(
                assembly.GetManifestResourceNames(),
                n => n.EndsWith(suffix, StringComparison.Ordinal));

            if (resourceName is null)
            {
                throw new InvalidOperationException("Embedded template not found: " + key);
            }

            using var stream = assembly.GetManifestResourceStream(resourceName)
                ?? throw new InvalidOperationException("Embedded template stream was null: " + key);
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        });
    }

    /// <summary>
    /// Loads a template and replaces its <c>{{KEY}}</c> tokens in a single pass, so substituted values
    /// are never rescanned for further tokens.
    /// </summary>
    /// <param name="name">The template name.</param>
    /// <param name="values">Token values keyed by name (without braces).</param>
    /// <returns>The filled template.</returns>
    public static string Fill(string name, IReadOnlyDictionary<string, string> values)
    {
        ArgumentNullException.ThrowIfNull(values);
        var template = Load(name);
        return TokenPattern().Replace(
            template,
            match => values.TryGetValue(match.Groups[1].Value, out var value) ? value : match.Value);
    }

    [GeneratedRegex(@"\{\{(\w+)\}\}")]
    private static partial Regex TokenPattern();
}
