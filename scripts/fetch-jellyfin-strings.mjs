// fetch-jellyfin-strings.mjs
// Fetches the web client's and the server's translations at the tags pinned in jellyfin.json, and writes them to
// dist/jellyfin/ for the package. A snapshot that already matches the pin is kept, so a build stays offline after the
// first fetch. scripts/bundle.sh runs it on every build.
//
//   node scripts/fetch-jellyfin-strings.mjs           Fetches when dist/jellyfin/ does not match the pin.
//   node scripts/fetch-jellyfin-strings.mjs --force   Fetches again even when it matches.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export var root = join(dirname(fileURLToPath(import.meta.url)), '..');
export var pinPath = join(root, 'jellyfin.json');
export var outDir = join(root, 'dist', 'jellyfin');

export var SOURCES = {
    web: {
        repo: 'https://github.com/jellyfin/jellyfin-web.git',
        strings: 'src/strings',
        locales: 'src/lib/globalize/locales.ts'
    },
    server: {
        repo: 'https://github.com/jellyfin/jellyfin.git',
        strings: 'Emby.Server.Implementations/Localization/Core'
    }
};

// MARK: fail
// Prints a reason and stops with a failing exit code.
// Param: message | what went wrong
export function fail(message) {
    console.error('fetch-jellyfin-strings: ' + message);
    process.exit(1);
}

// MARK: readPin
// Reads jellyfin.json and checks its shape.
// Returns: { jellyfin, strings: { web, server } }
export function readPin() {
    var pin;
    try {
        pin = JSON.parse(readFileSync(pinPath, 'utf8'));
    } catch (e) {
        fail('jellyfin.json is missing or is not JSON: ' + e.message);
    }
    if (!pin || !/^\d+\.\d+$/.test(pin.jellyfin || '')) fail('jellyfin.json needs "jellyfin" as major.minor, such as "12.4".');
    if (!pin.strings || typeof pin.strings.web !== 'string' || typeof pin.strings.server !== 'string') {
        fail('jellyfin.json needs "strings" with a "web" and a "server" tag, such as "v12.4".');
    }
    return pin;
}

// MARK: languageCode
// Writes a language code the way the web client compares them, lower case with a hyphen.
// Param: code | a file name without its extension, such as pt_BR
// Returns: the code, such as pt-br
export function languageCode(code) {
    return String(code).replace(/_/g, '-').toLowerCase();
}

// MARK: git
// Runs git and returns its output, or stops on a failure.
// Param: args | the arguments
// Param: cwd | the folder to run in [optional]
function git(args, cwd) {
    var result = spawnSync('git', ['-c', 'advice.detachedHead=false'].concat(args), { cwd: cwd, encoding: 'utf8' });
    if (result.error) fail('git could not run: ' + result.error.message);
    if (result.status !== 0) fail('git ' + args.join(' ') + ' failed:\n' + (result.stderr || result.stdout));
    return result.stdout.trim();
}

// MARK: checkout
// Clones only the given paths of a repository at a tag.
// Param: repo | the repository address
// Param: tag | the tag
// Param: paths | the files and folders to check out
// Param: into | an empty folder
// Returns: the commit the tag points to
function checkout(repo, tag, paths, into) {
    git(['clone', '--quiet', '--depth', '1', '--branch', tag, '--filter=blob:none', '--sparse', '--no-checkout', repo, into]);
    git(['sparse-checkout', 'set', '--no-cone'].concat(paths.map(function (p) { return '/' + p; })), into);
    git(['checkout', '--quiet'], into);
    return git(['rev-parse', 'HEAD'], into);
}

// MARK: readStrings
// Reads a translation file and checks that it holds only strings.
// Param: file | the file
// Returns: the strings by key
function readStrings(file) {
    var data;
    try {
        data = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
        fail(file + ' is not JSON: ' + e.message);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(file + ' is not a JSON object.');
    Object.keys(data).forEach(function (key) {
        if (typeof data[key] !== 'string') fail(file + ' has a value that is not a string at "' + key + '".');
    });
    return data;
}

// MARK: webLanguages
// Reads the languages the web client offers from its locale list.
// Param: file | src/lib/globalize/locales.ts
// Returns: the file names without their extension, such as pt-br
function webLanguages(file) {
    var text = readFileSync(file, 'utf8');
    var list = /const\s+languages\s*=\s*\[([\s\S]*?)\]/.exec(text);
    if (!list) fail('The web client\'s language list was not found in ' + SOURCES.web.locales + '. Update webLanguages to match it.');
    var names = (list[1].match(/['"][^'"]+['"]/g) || []).map(function (q) { return q.slice(1, -1); });
    if (names.indexOf('en-us') === -1) fail('The web client\'s language list has no en-us.');
    return names;
}

// MARK: writeSource
// Writes one source's languages as minified files, named by language code.
// Param: files | the language files, as { name, path }
// Param: into | the folder to write
// Returns: the language codes written
function writeSource(files, into) {
    mkdirSync(into, { recursive: true });
    var seen = {};
    return files.map(function (f) {
        var code = languageCode(f.name);
        if (seen[code]) fail(f.name + '.json and ' + seen[code] + '.json are both ' + code + '.');
        seen[code] = f.name;
        writeFileSync(join(into, code + '.json'), JSON.stringify(readStrings(f.path)));
        return code;
    }).sort();
}

// MARK: matches
// Checks whether the snapshot in dist/jellyfin/ came from the pinned tags and is complete.
// Param: pin | jellyfin.json
// Returns: true when it can be kept
export function matches(pin) {
    var sourcePath = join(outDir, 'source.json');
    if (!existsSync(sourcePath)) return false;
    try {
        var source = JSON.parse(readFileSync(sourcePath, 'utf8'));
        return ['web', 'server'].every(function (name) {
            var s = source[name];
            return s && s.tag === pin.strings[name] && s.languages.length > 0 && s.languages.every(function (code) {
                return existsSync(join(outDir, name, code + '.json'));
            });
        }) && existsSync(join(outDir, 'LICENSE'));
    } catch (e) {
        return false;
    }
}

// MARK: fetchStrings
// Fetches both sources at the pinned tags into dist/jellyfin/, replacing what is there only once both succeed.
// Param: pin | jellyfin.json
// Returns: the source.json written
export function fetchStrings(pin) {
    var work = mkdtempSync(join(tmpdir(), 'jellyfin-strings-'));
    var staged = outDir + '.tmp';
    rmSync(staged, { recursive: true, force: true });
    try {
        var web = join(work, 'web');
        var webCommit = checkout(SOURCES.web.repo, pin.strings.web, [SOURCES.web.strings + '/', SOURCES.web.locales, 'LICENSE'], web);
        var webDir = join(web, SOURCES.web.strings);
        var webNames = readdirSync(webDir);
        var webFiles = webLanguages(join(web, SOURCES.web.locales)).map(function (name) {
            // The list and the file names differ in case for some languages, such as bn_bd and bn_BD.json.
            var file = webNames.filter(function (n) { return n.toLowerCase() === (name + '.json').toLowerCase(); })[0];
            if (!file) fail('The web client lists ' + name + ' but has no ' + SOURCES.web.strings + '/' + name + '.json.');
            return { name: name, path: join(webDir, file) };
        });

        var server = join(work, 'server');
        var serverCommit = checkout(SOURCES.server.repo, pin.strings.server, [SOURCES.server.strings + '/', 'LICENSE'], server);
        var serverDir = join(server, SOURCES.server.strings);
        var serverFiles = readdirSync(serverDir).filter(function (n) { return n.endsWith('.json'); }).sort().map(function (n) {
            return { name: n.slice(0, -'.json'.length), path: join(serverDir, n) };
        });
        if (!serverFiles.some(function (f) { return languageCode(f.name) === 'en-us'; })) fail('The server has no en-US.json.');

        var source = {
            jellyfin: pin.jellyfin,
            web: { repo: SOURCES.web.repo, tag: pin.strings.web, commit: webCommit, languages: writeSource(webFiles, join(staged, 'web')) },
            server: { repo: SOURCES.server.repo, tag: pin.strings.server, commit: serverCommit, languages: writeSource(serverFiles, join(staged, 'server')) }
        };
        cpSync(join(server, 'LICENSE'), join(staged, 'LICENSE'));
        writeFileSync(join(staged, 'source.json'), JSON.stringify(source, null, 2) + '\n');

        mkdirSync(dirname(outDir), { recursive: true });
        rmSync(outDir, { recursive: true, force: true });
        renameSync(staged, outDir);
        return source;
    } finally {
        rmSync(work, { recursive: true, force: true });
        rmSync(staged, { recursive: true, force: true });
    }
}

// MARK: main
// Keeps a snapshot that matches the pin, or fetches one.
function main() {
    var pin = readPin();
    if (process.argv.indexOf('--force') === -1 && matches(pin)) {
        console.log('Jellyfin strings match jellyfin.json: web ' + pin.strings.web + ', server ' + pin.strings.server + '.');
        return;
    }
    var source = fetchStrings(pin);
    console.log('Fetched Jellyfin strings -> dist/jellyfin: web ' + source.web.tag + ' (' + source.web.languages.length + ' languages), server '
        + source.server.tag + ' (' + source.server.languages.length + ' languages).');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}

