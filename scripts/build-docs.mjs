// build-docs.mjs
// Writes the Reference section of each web component page from the code, and checks that every component has a
// page, a preview, a nav entry, and an index row. A page's Reference sits between the reference markers, and
// everything else on the page is written by hand. Run it after scripts/bundle.sh, which writes the export list.
//
//   node scripts/build-docs.mjs           Writes each page's Reference.
//   node scripts/build-docs.mjs --check   Fails when a Reference is out of date or a component lacks a page.

import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var root = join(dirname(fileURLToPath(import.meta.url)), '..');
var pagesDir = join(root, 'docs', 'components', 'web');
var previewsDir = join(root, 'docs', 'previews');
var cssDir = join(root, 'src', 'css');
var metaPath = join(root, 'dist', 'jpkribs_shared.meta.json');
var check = process.argv.indexOf('--check') !== -1;
var START = '<!-- reference:start -->';
var END = '<!-- reference:end -->';

// Source files that are not components, so they need no page of their own.
var NOT_COMPONENTS = ['index', 'types', 'globals', 'animations'];

// fail
// Prints a reason and stops with a failing exit code.
// Param: message | what went wrong
function fail(message) {
    console.error(message);
    process.exit(1);
}

// statements
// Splits a declaration file into its top level statements, each with the doc comment above it.
// Param: text | the declaration file
// Returns: an array of { doc, code }
function statements(text) {
    var list = [];
    var doc = [];
    var code = [];
    var depth = 0;
    var inComment = false;
    text.split('\n').forEach(function (line) {
        var trimmed = line.trim();
        if (!code.length && (inComment || trimmed.indexOf('/**') === 0)) {
            doc.push(line);
            inComment = trimmed.indexOf('*/') === -1;
            return;
        }
        if (!code.length && !trimmed) return;
        code.push(line);
        depth += (line.match(/[{(<]/g) || []).length - (line.match(/[})>]/g) || []).length + (line.match(/=>/g) || []).length;
        if (depth <= 0 && /[;}]\s*$/.test(line)) {
            list.push({ doc: doc.join('\n'), code: code.join('\n') });
            doc = [];
            code = [];
            depth = 0;
        }
    });
    return list;
}

// docText
// Turns a doc comment into plain lines, without the comment marks.
// Param: doc | the doc comment
// Returns: an array of lines
function docText(doc) {
    return doc.split('\n').map(function (l) { return l.replace(/^\s*\/\*\*\s?/, '').replace(/\s*\*\/\s*$/, '').replace(/^\s*\*\s?/, ''); });
}

// summary
// Reads the summary of a doc comment, the lines before the first blank line or tag.
// Param: doc | the doc comment
function summary(doc) {
    var out = [];
    docText(doc).some(function (line) {
        if (!line.trim() || line.trim().charAt(0) === '@') return out.length > 0;
        out.push(line.trim());
        return false;
    });
    return out.join(' ');
}

// optionNotes
// Reads the `name : what it is` lines of a function's options block, so each option gets its description.
// Param: doc | the function's doc comment
// Returns: an object from option name to its description
function optionNotes(doc) {
    var notes = {};
    var current = null;
    docText(doc).forEach(function (line) {
        var m = /^\s+(\w+)\s*:\s*(.*)$/.exec(line);
        if (m) {
            current = m[1];
            notes[current] = m[2].trim();
        } else if (current && /^\s{4,}\S/.test(line) && !/^\s*[@}]/.test(line)) {
            notes[current] += ' ' + line.trim();
        } else {
            current = null;
        }
    });
    return notes;
}

// members
// Reads the members of an interface, one per entry, with nested types kept on one line.
// Param: code | the interface declaration
// Returns: an array of { name, optional, type }
function members(code) {
    var body = code.slice(code.indexOf('{') + 1, code.lastIndexOf('}'));
    var out = [];
    var cur = '';
    var depth = 0;
    for (var i = 0; i < body.length; i++) {
        var c = body[i];
        if ('{(<['.indexOf(c) !== -1) depth++;
        if ('})>]'.indexOf(c) !== -1) depth--;
        if (c === ';' && depth === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    return out.map(function (m) { return m.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim(); }).filter(Boolean).map(function (m) {
        var match = /^(readonly\s+)?(\w+)(\?)?(.*)$/.exec(m);
        if (!match) return { name: m, optional: false, type: '' };
        var rest = match[4].trim();
        var type = rest.charAt(0) === ':' ? rest.slice(1).trim() : rest;
        return { name: match[2], optional: !!match[3], type: type };
    });
}

// code
// Writes a type as inline code that a markdown table cell can hold, since a pipe would end the cell.
// Param: text | the type text
function code(text) {
    var safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;');
    return '<code>' + safe + '</code>';
}

// cell
// Makes prose safe for a markdown table cell.
// Param: text | the prose
function cell(text) {
    return String(text || '').replace(/\|/g, '&#124;');
}

// cssClasses
// Reads each described selector of a component's CSS: its description line and its first class.
// Param: name | the component name
// Returns: an array of { name, description }
function cssClasses(name) {
    var path = join(cssDir, name + '.css');
    if (!existsSync(path)) return [];
    var lines = readFileSync(path, 'utf8').split('\n');
    var out = [];
    var seen = {};
    for (var i = 0; i + 2 < lines.length; i++) {
        var first = /^\/\* (.+) \*\/$/.exec(lines[i].trim());
        var example = /^\/\* Example:/.test(lines[i + 1].trim());
        if (!first || !example) continue;
        var selector = lines[i + 2];
        // The class and its modifiers, such as base-badge.medium, so a modifier with its own description is listed too.
        var cls = /\.(base-[a-z0-9-]+(?:\.[a-z0-9-]+)*)/.exec(selector);
        if (!cls || seen[cls[1]]) continue;
        seen[cls[1]] = true;
        out.push({ name: cls[1], description: first[1] });
    }
    return out;
}

// reference
// Builds the Reference markdown for one component from its declarations and its CSS.
// Param: name | the component name
// Param: decls | the component's statements
// Param: runtime | the set of names the bundle exports
// Returns: the markdown between the markers, or an empty string when there is nothing to list
function reference(name, decls, runtime) {
    var interfaces = {};
    var types = [];
    var functions = [];
    decls.forEach(function (s) {
        var m = /^export (?:declare )?(function|var|const|let|interface|type) (\w+)/.exec(s.code);
        if (!m) return;
        if (m[1] === 'interface') interfaces[m[2]] = s;
        if (m[1] === 'interface' || m[1] === 'type') types.push({ name: m[2], doc: s.doc, kind: m[1], code: s.code });
        if ((m[1] === 'function' || m[1] === 'var' || m[1] === 'const') && runtime.has(m[2])) functions.push({ name: m[2], doc: s.doc, code: s.code });
    });
    var out = [];
    var listed = {};
    functions.forEach(function (f) {
        var signature = f.code.replace(/^export (declare )?/, '').replace(/;\s*$/, '').replace(/\s+/g, ' ');
        out.push('### `' + f.name + '`', '', code(signature), '');
        if (summary(f.doc)) out.push(summary(f.doc), '');
        var notes = optionNotes(f.doc);
        var opt = /\(\s*\w+\??:\s*(\w+)(?:<[^>]*>)?\s*[,)]/.exec(signature);
        var optName = opt && interfaces[opt[1]] ? opt[1] : (/\w+\??: (\w+Options)\b/.exec(signature) || [])[1];
        if (optName && interfaces[optName]) {
            listed[optName] = true;
            out.push('| Option | Type | What it does |', '| :--- | :--- | :--- |');
            members(interfaces[optName].code).forEach(function (mem) {
                out.push('| `' + mem.name + '`' + (mem.optional ? '' : ' (required)') + ' | ' + code(mem.type) + ' | ' + cell(notes[mem.name]) + ' |');
            });
            out.push('');
        }
        var ret = /\):\s*(\w+Handle)\b/.exec(signature);
        if (ret && interfaces[ret[1]]) {
            listed[ret[1]] = true;
            out.push('| Handle member | Type |', '| :--- | :--- |');
            members(interfaces[ret[1]].code).forEach(function (mem) {
                out.push('| `' + mem.name + '` | ' + code(mem.type) + ' |');
            });
            out.push('');
        }
    });
    var others = types.filter(function (t) { return !listed[t.name]; });
    if (others.length) {
        out.push('| Type | What it is |', '| :--- | :--- |');
        others.forEach(function (t) { out.push('| `' + t.name + '` | ' + cell(summary(t.doc)) + ' |'); });
        out.push('');
    }
    var classes = cssClasses(name);
    if (classes.length) {
        out.push('| Class | What it looks like |', '| :--- | :--- |');
        classes.forEach(function (c) { out.push('| `' + c.name + '` | ' + cell(c.description) + ' |'); });
        out.push('');
    }
    return out.join('\n').trim();
}

// place
// Puts a Reference into a page, between its markers, or before its Example on a page that has none yet.
// Param: page | the page text
// Param: body | the Reference markdown
// Returns: the new page text
function place(page, body) {
    var block = START + '\n\n' + body + '\n\n' + END;
    var s = page.indexOf(START);
    var e = page.indexOf(END);
    if (s !== -1 && e !== -1) return page.slice(0, s) + block + page.slice(e + END.length);
    var section = '## Reference\n\nGenerated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.\n\n' + block + '\n\n';
    var at = page.indexOf('\n## Example');
    if (at === -1) return page.replace(/\s*$/, '\n\n') + section.trim() + '\n';
    return page.slice(0, at + 1) + section + page.slice(at + 1);
}

if (!existsSync(metaPath)) fail('Run scripts/bundle.sh first. ' + metaPath + ' is missing.');
var runtime = new Set(Object.values(JSON.parse(readFileSync(metaPath, 'utf8')).outputs)[0].exports);

var temp = mkdtempSync(join(tmpdir(), 'base-docs-'));
var tsc = spawnSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(root, 'tsconfig.json'), '--noEmit', 'false', '--declaration', '--emitDeclarationOnly', '--rootDir', join(root, 'src', 'js'), '--outDir', temp], { encoding: 'utf8' });
if (tsc.status !== 0) fail('tsc could not emit the declarations.\n' + tsc.stdout + tsc.stderr);

var problems = [];
var stale = [];
var written = 0;
var pages = readdirSync(pagesDir).filter(function (f) { return f.endsWith('.md') && f !== 'index.md'; }).map(function (f) { return f.replace(/\.md$/, ''); });
var components = {};
readdirSync(temp).filter(function (f) { return f.endsWith('.d.ts'); }).forEach(function (f) { components[f.replace(/\.d\.ts$/, '')] = true; });
readdirSync(cssDir).filter(function (f) { return f.endsWith('.css'); }).forEach(function (f) { components[f.replace(/\.css$/, '')] = true; });
NOT_COMPONENTS.forEach(function (n) { delete components[n]; });

Object.keys(components).sort().forEach(function (name) {
    if (pages.indexOf(name) === -1) problems.push('No docs page for the component ' + name + '. Add docs/components/web/' + name + '.md.');
});

var nav = readFileSync(join(root, 'mkdocs.yml'), 'utf8');
var index = readFileSync(join(pagesDir, 'index.md'), 'utf8');
pages.forEach(function (name) {
    if (nav.indexOf('components/web/' + name + '.md') === -1) problems.push('mkdocs.yml has no nav entry for ' + name + '.md.');
    if (index.indexOf('(' + name + '.md)') === -1) problems.push('docs/components/web/index.md has no row for ' + name + '.md.');
    if (!existsSync(join(previewsDir, name + '.html'))) problems.push('No preview for ' + name + '. Add docs/previews/' + name + '.html.');
    if (!components[name]) return;
    var declPath = join(temp, name + '.d.ts');
    var decls = existsSync(declPath) ? statements(readFileSync(declPath, 'utf8')) : [];
    var body = reference(name, decls, runtime);
    if (!body) return;
    var pagePath = join(pagesDir, name + '.md');
    var page = readFileSync(pagePath, 'utf8');
    var next = place(page, body);
    if (next === page) return;
    if (check) stale.push(name);
    else { writeFileSync(pagePath, next); written++; }
});
rmSync(temp, { recursive: true, force: true });

if (stale.length) problems.push('These pages have an out of date Reference. Run node scripts/build-docs.mjs: ' + stale.join(', ') + '.');
if (problems.length) fail(problems.join('\n'));
console.log(check ? 'Docs match the code: ' + pages.length + ' pages.' : 'Wrote the Reference of ' + written + ' pages. ' + pages.length + ' pages checked.');
