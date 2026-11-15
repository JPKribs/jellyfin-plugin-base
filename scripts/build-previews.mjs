#!/usr/bin/env node
// Builds the live preview pages that the docs site embeds in iframes.
//
// Each docs/previews/<name>.html is one snippet, the markup and a module script that calls the real Base
// API. This script wraps every snippet in docs/previews/_shell.html and writes the page to
// docs/assets/previews/<name>.html, next to a copy of the bundle (dist/jpkribs_shared.*) and of the shared
// Jellyfin stubs (docs/previews/_stubs.js), and of the status template (src/templates/status.html). The output is not committed. mkdocs copies it into the site.
//
// A snippet may start with these comments, and nothing else on its first lines:
//   <!-- title: Badge -->          the page title, the file name when absent
//   <!-- min-height: 360 -->       the least frame height in pixels, for a snippet whose content is fixed
//                                  or an overlay and so does not size the page, 0 when absent
//
// Usage: node scripts/build-previews.mjs   (run scripts/bundle.sh first)
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'docs', 'previews');
const out = path.join(root, 'docs', 'assets', 'previews');
const dist = path.join(root, 'dist');

for (const file of ['jpkribs_shared.css', 'jpkribs_shared.js']) {
    if (!existsSync(path.join(dist, file))) {
        console.error(`dist/${file} is missing. Run scripts/bundle.sh first.`);
        process.exit(1);
    }
}

const shell = await readFile(path.join(source, '_shell.html'), 'utf8');

await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'base'), { recursive: true });
await copyFile(path.join(dist, 'jpkribs_shared.css'), path.join(out, 'base', 'jpkribs_shared.css'));
await copyFile(path.join(dist, 'jpkribs_shared.js'), path.join(out, 'base', 'jpkribs_shared.js'));
await copyFile(path.join(source, '_stubs.js'), path.join(out, 'base', 'jellyfin-stubs.js'));
// The status page template, which the Status Page preview fills the way StatusPage.Render does.
await copyFile(path.join(root, 'src', 'templates', 'status.html'), path.join(out, 'base', 'status.html'));

// Reads and removes the leading <!-- key: value --> comments of a snippet.
function takeMeta(text) {
    const meta = {};
    let body = text;
    for (;;) {
        const m = /^\s*<!--\s*([a-z-]+)\s*:\s*(.*?)\s*-->\s*\n?/.exec(body);
        if (!m) { break; }
        meta[m[1]] = m[2];
        body = body.slice(m[0].length);
    }
    return { meta, body };
}

const escapeText = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const names = (await readdir(source)).filter(n => n.endsWith('.html') && !n.startsWith('_')).sort();
for (const name of names) {
    const { meta, body } = takeMeta(await readFile(path.join(source, name), 'utf8'));
    const min = Number.parseInt(meta['min-height'] ?? '0', 10);
    const values = {
        TITLE: escapeText(meta.title ?? path.basename(name, '.html')),
        MIN_HEIGHT: String(Number.isFinite(min) ? min : 0),
        BODY: body.trimEnd()
    };
    // A function replacement keeps a "$" in a snippet literal.
    const page = shell.replace(/\{\{(TITLE|MIN_HEIGHT|BODY)\}\}/g, (_, key) => values[key]);
    await writeFile(path.join(out, name), page);
    console.log(`Preview -> docs/assets/previews/${name}`);
}

console.log(`Built ${names.length} preview(s) in docs/assets/previews`);
