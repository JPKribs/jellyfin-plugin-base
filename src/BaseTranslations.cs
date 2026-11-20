using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using MediaBrowser.Controller.Configuration;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// The plugin's translations: the Jellyfin strings it declares and its own Localization strings, built into the plugin
/// as one file per language. A string missing from a language falls back to the language's base, such as pt for pt-br,
/// then to US English.
/// </summary>
public static partial class BaseTranslations
{
    /// <summary>The language every other one falls back to.</summary>
    public const string FallbackLanguage = "en-us";

    private const string ResourcePrefix = "JPKribs.Translations.";

    private static readonly Lazy<Dictionary<string, string>> _resources = new(FindResources);
    private static readonly ConcurrentDictionary<string, IReadOnlyDictionary<string, string>> _files = new(StringComparer.Ordinal);
    private static readonly ConcurrentDictionary<string, Served> _merged = new(StringComparer.Ordinal);

    /// <summary>
    /// Gets the languages the plugin has strings for, as lower case codes with a hyphen, such as pt-br.
    /// </summary>
    public static IReadOnlyCollection<string> Languages => _resources.Value.Keys;

    /// <summary>
    /// Writes a language code the way the web client compares them, lower case with a hyphen.
    /// </summary>
    /// <param name="language">The language, such as pt_BR or de.</param>
    /// <returns>The code, such as pt-br, or an empty string when the text is not a language code.</returns>
    public static string NormalizeLanguage(string? language)
    {
        var code = (language ?? string.Empty).Trim().Replace('_', '-').ToLowerInvariant();
        return LanguageCode().IsMatch(code) ? code : string.Empty;
    }

    /// <summary>
    /// Gets every string in a language, each falling back to the language's base and then to US English.
    /// </summary>
    /// <param name="language">The language, such as de or pt-BR. <c>null</c>, empty, or not a language code gives US English.</param>
    /// <returns>The strings by key.</returns>
    public static IReadOnlyDictionary<string, string> For(string? language) => Resolve(language).Strings;

    /// <summary>
    /// Gets one string in a language.
    /// </summary>
    /// <param name="key">The key, such as <c>TranslationKeys.MyRequests</c>.</param>
    /// <param name="language">The language, or <c>null</c> for US English.</param>
    /// <returns>The text, or the key itself when no language has it.</returns>
    public static string Get(string key, string? language = null)
    {
        ArgumentNullException.ThrowIfNull(key);
        return For(language).TryGetValue(key, out var text) ? text : key;
    }

    /// <summary>
    /// Gets one string in a language and fills its <c>{0}</c>, <c>{1}</c> placeholders, formatting each value for that language.
    /// </summary>
    /// <param name="key">The key.</param>
    /// <param name="language">The language, or <c>null</c> for US English.</param>
    /// <param name="args">The values for the placeholders, in order.</param>
    /// <returns>The text, with a placeholder that has no value left as it is.</returns>
    public static string Format(string key, string? language, params object?[] args)
        => FormatText(Get(key, language), Culture(language), args);

    /// <summary>
    /// Fills the <c>{0}</c>, <c>{1}</c> placeholders of a text. A brace that is not a placeholder is kept, so a
    /// translation never makes it throw.
    /// </summary>
    /// <param name="text">The text.</param>
    /// <param name="culture">The culture each value is formatted for, or <c>null</c> for the invariant culture.</param>
    /// <param name="args">The values for the placeholders, in order.</param>
    /// <returns>The filled text.</returns>
    public static string FormatText(string text, CultureInfo? culture, params object?[] args)
    {
        ArgumentNullException.ThrowIfNull(text);
        if (args is null || args.Length == 0)
        {
            return text;
        }

        var provider = culture ?? CultureInfo.InvariantCulture;
        return Placeholder().Replace(text, m =>
        {
            var index = int.Parse(m.Groups[1].ValueSpan, NumberStyles.None, CultureInfo.InvariantCulture);
            return index < args.Length ? Convert.ToString(args[index], provider) ?? string.Empty : m.Value;
        });
    }

    /// <summary>
    /// Gets the server's display language, for text the server writes for everyone, such as activity log entries.
    /// </summary>
    /// <param name="config">The server configuration.</param>
    /// <returns>The language, such as en-US.</returns>
    public static string ServerLanguage(IServerConfigurationManager config)
    {
        ArgumentNullException.ThrowIfNull(config);
        return config.Configuration.UICulture ?? FallbackLanguage;
    }

    /// <summary>
    /// Answers a request for the strings in a language as JSON, for the shared <c>loadTranslations</c> on a page. The
    /// answer carries an ETag and is revalidated on every load, so a plugin update reaches the page at once.
    /// </summary>
    /// <param name="language">The language from the request, such as de.</param>
    /// <param name="request">The request, read for If-None-Match.</param>
    /// <param name="response">The response, which receives the cache headers.</param>
    /// <returns>The strings, or 304 Not Modified when the page already has them.</returns>
    public static IActionResult Serve(string? language, HttpRequest request, HttpResponse response)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(response);

        var served = Resolve(language);
        response.Headers.CacheControl = "no-cache";
        response.Headers.ETag = served.ETag;
        if (request.Headers.IfNoneMatch.Any(v => string.Equals(v, served.ETag, StringComparison.Ordinal)))
        {
            return new StatusCodeResult(StatusCodes.Status304NotModified);
        }

        return new FileContentResult(served.Json, "application/json; charset=utf-8");
    }

    // The files that apply, most specific last: US English, the base, then the language itself.
    private static Served Resolve(string? language)
    {
        var code = NormalizeLanguage(language);
        var chain = new List<string> { FallbackLanguage };
        var dash = code.IndexOf('-', StringComparison.Ordinal);
        if (dash > 0)
        {
            chain.Add(code[..dash]);
        }

        if (code.Length > 0)
        {
            chain.Add(code);
        }

        // Only codes the plugin has are kept, so the cache cannot grow from the codes a request makes up.
        var kept = chain.Distinct(StringComparer.Ordinal).Where(_resources.Value.ContainsKey).ToList();
        return _merged.GetOrAdd(string.Join('|', kept), _ =>
        {
            var merged = new SortedDictionary<string, string>(StringComparer.Ordinal);
            foreach (var file in kept)
            {
                foreach (var (key, text) in Load(file))
                {
                    merged[key] = text;
                }
            }

            var json = JsonSerializer.SerializeToUtf8Bytes(merged);
            return new Served(merged, json, "\"" + Convert.ToHexString(SHA256.HashData(json))[..16].ToLowerInvariant() + "\"");
        });
    }

    private static IReadOnlyDictionary<string, string> Load(string code)
        => _files.GetOrAdd(code, c =>
        {
            using var stream = typeof(BaseTranslations).Assembly.GetManifestResourceStream(_resources.Value[c]);
            if (stream is null)
            {
                return new Dictionary<string, string>(StringComparer.Ordinal);
            }

            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, string>>(stream) ?? new Dictionary<string, string>(StringComparer.Ordinal);
            }
            catch (JsonException)
            {
                return new Dictionary<string, string>(StringComparer.Ordinal);
            }
        });

    private static Dictionary<string, string> FindResources()
        => typeof(BaseTranslations).Assembly.GetManifestResourceNames()
            .Where(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal) && n.EndsWith(".json", StringComparison.Ordinal))
            .ToDictionary(n => n[ResourcePrefix.Length..^".json".Length], n => n, StringComparer.Ordinal);

    private static CultureInfo Culture(string? language)
    {
        try
        {
            var code = NormalizeLanguage(language);
            return code.Length == 0 ? CultureInfo.InvariantCulture : CultureInfo.GetCultureInfo(code);
        }
        catch (CultureNotFoundException)
        {
            return CultureInfo.InvariantCulture;
        }
    }

    [GeneratedRegex(@"^[a-z]{2,3}(-[a-z0-9]{2,8})*$")]
    private static partial Regex LanguageCode();

    [GeneratedRegex(@"\{(\d{1,9})\}")]
    private static partial Regex Placeholder();

    private sealed record Served(IReadOnlyDictionary<string, string> Strings, byte[] Json, string ETag);
}
