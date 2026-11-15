# Pages and Templates

Standalone pages that a plugin serves outside the dashboard, such as invite links, public download pages, and "page not found".

A standalone page renders through `StatusPage`, which fills the embedded `status` template. `PublicPage` adds the response headers and the favicon that those pages need.

## TemplateLoader

Loads an embedded HTML template by name and fills `{{KEY}}` tokens in one pass.

A template is found by suffix, which is the first resource in the plugin's assembly whose name ends with `.Templates.<name>.html`. The targets file embeds the package's own `status` template that way. To use your own template, embed it with a logical name that ends in `.Templates.<name>.html`.

```csharp
var html = TemplateLoader.Fill("status", new Dictionary<string, string>
{
    ["TITLE"] = "Download",
    ["HEADING"] = "Heading text",
    ["MESSAGE"] = "Message text",
    ["SPINNER"] = string.Empty,
    ["BUTTON"] = string.Empty,
    ["CONTENT"] = string.Empty
});
```

**Gotchas**

* A template is read once and cached for the life of the process. A missing resource throws `InvalidOperationException`.
* Values are inserted as is, with no encoding. Encode untrusted text before you pass it.
* A value that looks like a token is not expanded again, and a token with no entry stays in the text. Pass an empty string, not null, for a slot you want empty.
* Key matching follows the dictionary's comparer.
* The `status` template uses `TITLE`, `HEADING`, `MESSAGE`, `SPINNER`, `BUTTON`, and `CONTENT`.

## StatusPage

Renders the standalone Jellyfin-themed status card, a centered card with a logo, a heading, a message, an optional spinner, and an optional button. The markup is self contained and needs none of the dashboard assets.

```csharp
PublicPage.ApplyHardeningHeaders(Response);
var html = StatusPage.Render(
    "Loading",
    string.Empty,
    title: "Download",
    buttonText: null,
    showSpinner: true,
    content: GetContentFragment());
return Content(html, "text/html");
```

**Gotchas**

* `Render` returns a complete HTML document. The heading, message, title, button text, and button address are HTML-encoded.
* `content` is raw HTML placed below the message and is not encoded, so pass only markup the plugin owns.
* The button shows only when both its text and its address are non-empty. The defaults are "Back to Jellyfin" and `../web/`.
* The page links `favicon.ico` relatively and loads the logo from `../web/favicons/touchicon.png`. Expose a sibling `favicon.ico` route backed by `PublicPage.Favicon` to give the tab the server's icon.

## PublicPage

Response helpers for standalone pages. `ApplyHardeningHeaders` keeps a page and any token in its URL out of referrers, caches, and search indexes without a reverse proxy. `Favicon` returns the server's icon.

```csharp
[HttpGet("favicon.ico")]
[AllowAnonymous]
public IActionResult Favicon() => PublicPage.Favicon(_paths, Response);
```

**Gotchas**

* `ApplyHardeningHeaders` sets `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `X-Robots-Tag: noindex, nofollow`, replacing earlier values.
* Do not call it on the favicon response, since its `no-store` would replace the one day cache that `Favicon` sets.
* `Favicon` returns a not found result when no icon exists.

## FaviconResolver

Finds the web client's favicon on disk. The file name is content hashed and changes per build, so it is found by reading the web client's `index.html`. Use `PublicPage.Favicon` unless you need the bytes yourself.

```csharp
var icon = FaviconResolver.Resolve(paths);
if (icon is { } favicon)
{
    return File(favicon.Bytes, favicon.ContentType);
}
```

**Gotchas**

* Every call resolves from disk. There is no cache.
* It reads the `href` of a `<link rel="icon">` or `rel="shortcut icon"` and needs `rel` before `href`, with double quotes. The file must stay inside the web folder and exist.
* Otherwise it uses the first `favicon*.ico` in the web folder.
* The content type is `image/png` for a `.png` file and `image/x-icon` for anything else, including an SVG icon.
* It returns null when the folder or file is missing, or when it cannot read the file.
