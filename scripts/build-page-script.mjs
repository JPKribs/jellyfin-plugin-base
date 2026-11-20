// build-page-script.mjs
// Builds the standalone page script from src/js/lib/page-script.ts, the push and casing cores the bundle uses, and writes it into
// src/BasePageScript.cs, which serves it to pages that load neither the bundle nor its CSS. Run it after changing those sources.
//
//   node scripts/build-page-script.mjs           Writes src/BasePageScript.cs.
//   node scripts/build-page-script.mjs --check   Fails when src/BasePageScript.cs is not the current build.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

var root = join(dirname(fileURLToPath(import.meta.url)), '..');
var target = join(root, 'src', 'BasePageScript.cs');

/** Bundles the entry into one minified script, which sets the global BasePage. */
export function buildPageScript() {
    var result = buildSync({
        entryPoints: [join(root, 'src', 'js', 'lib', 'page-script.ts')],
        bundle: true,
        format: 'iife',
        target: 'es2018',
        minify: true,
        legalComments: 'none',
        write: false
    });
    return result.outputFiles[0].text.trim();
}

/** The C# file that holds a script, in a raw string whose quotes are longer than any run of quotes in the script. */
export function pageScriptSource(script) {
    var longest = Math.max(0, ...(script.match(/"+/g) || []).map(function (q) { return q.length; }));
    var quotes = '"'.repeat(Math.max(3, longest + 1));
    var body = script.split('\n').map(function (line) { return '        ' + line; }).join('\n');
    return [
        'using System;',
        'using Microsoft.AspNetCore.Http;',
        'using Microsoft.AspNetCore.Mvc;',
        '',
        'namespace JPKribs.Jellyfin.Base;',
        '',
        '/// <summary>',
        '/// The standalone page script, for a page that loads neither the bundle nor its CSS, such as one that mirrors the web client. It sets',
        '/// the global <c>BasePage</c> with the bundle\'s web push and casing helpers, built from the same sources, and holds no text of its own.',
        '/// </summary>',
        '/// <remarks>',
        '/// scripts/build-page-script.mjs writes this file from <c>src/js/lib/page-script.ts</c>, and a test fails when it is out of date.',
        '/// </remarks>',
        'public static class BasePageScript',
        '{',
        '    /// <summary>',
        '    /// The script. It defines <c>BasePage.webPushState</c>, <c>subscribeWebPush</c>, and <c>unsubscribeWebPush</c>, which resolve to a',
        '    /// state code, <c>webPushLabel</c>, and <c>titleCase</c> and <c>sentenceCase</c>, which take the plugin\'s casing list.',
        '    /// </summary>',
        '    public const string Script = ' + quotes,
        body,
        '        ' + quotes + ';',
        '',
        '    /// <summary>',
        '    /// Answers a request for the script, as JavaScript that a browser checks again on every load.',
        '    /// </summary>',
        '    /// <param name="response">The response, which receives the cache header.</param>',
        '    /// <returns>The script.</returns>',
        '    public static ContentResult Serve(HttpResponse response)',
        '    {',
        '        ArgumentNullException.ThrowIfNull(response);',
        '        response.Headers.CacheControl = "no-cache";',
        '        return new ContentResult { Content = Script, ContentType = "text/javascript; charset=utf-8", StatusCode = StatusCodes.Status200OK };',
        '    }',
        '}',
        ''
    ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    var source = pageScriptSource(buildPageScript());
    if (process.argv.includes('--check')) {
        var current = readFileSync(target, 'utf8');
        if (current !== source) {
            console.error('src/BasePageScript.cs is not the current build. Run node scripts/build-page-script.mjs and commit it.');
            process.exit(1);
        }
        console.log('src/BasePageScript.cs matches the build.');
    } else {
        writeFileSync(target, source);
        console.log('Wrote src/BasePageScript.cs.');
    }
}
