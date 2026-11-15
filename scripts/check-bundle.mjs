// check-bundle.mjs
// Compares the JS bundle with the golden copy, so a source change that alters what plugins receive fails.
// It builds the bundle as scripts/bundle.sh does but keeps the original names, since the minifier picks short
// names from the source's character counts and adding types alone would rename them.
//
//   node scripts/check-bundle.mjs            Compares the build with JPKribs.Jellyfin.Base.Tests/golden/.
//   node scripts/check-bundle.mjs --update   Replaces the golden copy with the current build.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync, transformSync } from 'esbuild';

var root = join(dirname(fileURLToPath(import.meta.url)), '..');
var entry = existsSync(join(root, 'src', 'js', 'index.ts')) ? join(root, 'src', 'js', 'index.ts') : join(root, 'src', 'js', 'index.js');
var distMeta = join(root, 'dist', 'jpkribs_shared.meta.json');
var goldenDir = join(root, 'JPKribs.Jellyfin.Base.Tests', 'golden');
var goldenJs = join(goldenDir, 'jpkribs_shared.js');
var goldenSummary = join(goldenDir, 'jpkribs_shared.json');

// build
// Bundles the sources with the options in scripts/bundle.sh, less name mangling. Keep the two in step.
// Returns: { code, meta }
function build() {
    var result = buildSync({
        entryPoints: [entry], bundle: true, format: 'esm', target: 'chrome87', legalComments: 'none',
        minifySyntax: true, minifyWhitespace: true, minifyIdentifiers: false,
        metafile: true, write: false, outfile: 'jpkribs_shared.js', logLevel: 'silent'
    });
    return { code: result.outputFiles[0].text, meta: result.metafile };
}

// summarize
// Reads an esbuild metafile into the export list and each component's bytes, keyed without the extension.
// Param: meta | the metafile
// Returns: { exports, components, bytes }
function summarize(meta) {
    var output = Object.values(meta.outputs)[0];
    var components = {};
    Object.keys(output.inputs).sort().forEach(function (input) {
        var name = input.replace(/^.*src\/js\//, '').replace(/\.(js|ts)$/, '');
        components[name] = output.inputs[input].bytesInOutput;
    });
    return { exports: output.exports.slice().sort(), components: components, bytes: output.bytes };
}

// pretty
// Formats a minified bundle one statement per line, so a diff of two bundles is readable.
// Param: code | minified JS
function pretty(code) {
    return transformSync(code, { format: 'esm', minify: false }).code;
}

var built = build();
var current = summarize(built.meta);
var currentCode = built.code;

if (process.argv.includes('--update')) {
    mkdirSync(goldenDir, { recursive: true });
    writeFileSync(goldenJs, currentCode);
    writeFileSync(goldenSummary, JSON.stringify(current, null, 2) + '\n');
    console.log('Golden copy updated: ' + current.exports.length + ' exports, ' + current.bytes + ' bytes.');
    process.exit(0);
}

var golden = JSON.parse(readFileSync(goldenSummary, 'utf8'));
var goldenCode = readFileSync(goldenJs, 'utf8');
var problems = [];

var added = current.exports.filter(function (e) { return golden.exports.indexOf(e) < 0; });
var removed = golden.exports.filter(function (e) { return current.exports.indexOf(e) < 0; });
if (added.length) problems.push('Exports added: ' + added.join(', '));
// The shipped bundle from scripts/bundle.sh, when present, must export the same names.
if (existsSync(distMeta)) {
    var shipped = summarize(JSON.parse(readFileSync(distMeta, 'utf8'))).exports.join(',');
    if (shipped !== current.exports.join(',')) problems.push('dist/jpkribs_shared.js exports differ from the checked build. Rerun scripts/bundle.sh.');
}
if (removed.length) problems.push('Exports removed: ' + removed.join(', '));

Object.keys(Object.assign({}, golden.components, current.components)).sort().forEach(function (name) {
    var was = golden.components[name];
    var now = current.components[name];
    if (was !== now) problems.push('Component ' + name + ': ' + (was === undefined ? 'new' : was + ' bytes') + ' -> ' + (now === undefined ? 'gone' : now + ' bytes'));
});

if (currentCode !== goldenCode) {
    problems.push('Bundle text differs: ' + goldenCode.length + ' -> ' + currentCode.length + ' characters.');
    var diffDir = join(root, 'dist', 'golden-diff');
    mkdirSync(diffDir, { recursive: true });
    writeFileSync(join(diffDir, 'golden.js'), pretty(goldenCode));
    writeFileSync(join(diffDir, 'current.js'), pretty(currentCode));
    var diff = spawnSync('diff', ['-u', join(diffDir, 'golden.js'), join(diffDir, 'current.js')], { encoding: 'utf8' });
    var lines = (diff.stdout || '').split('\n');
    problems.push('Formatted diff, first 80 lines (full copies in dist/golden-diff/):\n' + lines.slice(0, 80).join('\n'));
}

if (problems.length) {
    console.error('The bundle does not match the golden copy.\n\n' + problems.join('\n') + '\n\nWhen the change is intended, run node scripts/check-bundle.mjs --update and commit the golden copy.');
    process.exit(1);
}

console.log('Bundle matches the golden copy: ' + current.exports.length + ' exports, ' + Object.keys(current.components).length + ' components, ' + current.bytes + ' bytes.');
