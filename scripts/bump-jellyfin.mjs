// bump-jellyfin.mjs
// Moves Base to another Jellyfin release. It checks the tags exist, writes jellyfin.json, fetches the strings, and
// lists the US English keys that were added, removed, or reworded, since a plugin that declares a removed key no
// longer builds. A new Jellyfin version also moves the test project's Jellyfin packages and starts the package
// versions over at <version>.0.
//
//   node scripts/bump-jellyfin.mjs v12.4.1                  Takes the web client's and the server's strings from v12.4.1.
//   node scripts/bump-jellyfin.mjs --web v12.4.1            Moves only the web client's strings.
//   node scripts/bump-jellyfin.mjs --server v12.4.1         Moves only the server's strings.
//   node scripts/bump-jellyfin.mjs --jellyfin 12.5 [tag]    Targets Jellyfin 12.5, with strings from the tag (default v12.5).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { SOURCES, fail, fetchStrings, outDir, pinPath, readPin, root } from './fetch-jellyfin-strings.mjs';

var testProject = join(root, 'JPKribs.Jellyfin.Base.Tests', 'JPKribs.Jellyfin.Base.Tests.csproj');

// MARK: parseArgs
// Reads the command line into the pin it asks for.
// Param: pin | the current jellyfin.json
// Returns: the new pin
function parseArgs(pin) {
    var args = process.argv.slice(2);
    var next = { jellyfin: pin.jellyfin, strings: { web: pin.strings.web, server: pin.strings.server } };
    if (!args.length) fail('Name a tag, such as v12.4.1, or --jellyfin 12.5. See the comment at the top of this script.');
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        if (arg === '--web' || arg === '--server') {
            if (!args[i + 1]) fail(arg + ' needs a tag.');
            next.strings[arg.slice(2)] = args[++i];
        } else if (arg === '--jellyfin') {
            var version = args[++i] || '';
            if (!/^\d+\.\d+$/.test(version)) fail('--jellyfin needs major.minor, such as 12.5.');
            next.jellyfin = version;
            var tag = args[i + 1] && args[i + 1].indexOf('--') !== 0 ? args[++i] : 'v' + version;
            next.strings.web = tag;
            next.strings.server = tag;
        } else if (arg.indexOf('--') === 0) {
            fail('Unknown option ' + arg + '.');
        } else {
            next.strings.web = arg;
            next.strings.server = arg;
        }
    }
    return next;
}

// MARK: tagExists
// Checks that a repository has a tag.
// Param: repo | the repository address
// Param: tag | the tag
function tagExists(repo, tag) {
    var result = spawnSync('git', ['ls-remote', '--tags', '--exit-code', repo, 'refs/tags/' + tag], { encoding: 'utf8' });
    if (result.error) fail('git could not run: ' + result.error.message);
    return result.status === 0;
}

// MARK: english
// Reads a source's US English strings from the snapshot, or an empty set when there is none.
// Param: name | web or server
function english(name) {
    var file = join(outDir, name, 'en-us.json');
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

// MARK: report
// Prints what changed in a source's US English strings.
// Param: name | web or server
// Param: before | the strings before
// Param: after | the strings after
function report(name, before, after) {
    var added = Object.keys(after).filter(function (k) { return !(k in before); });
    var removed = Object.keys(before).filter(function (k) { return !(k in after); });
    var reworded = Object.keys(after).filter(function (k) { return k in before && before[k] !== after[k]; });
    console.log('\n' + name + ': ' + added.length + ' added, ' + removed.length + ' removed, ' + reworded.length + ' reworded.');
    if (removed.length) {
        console.log('  Removed keys. A plugin that declares one of these as a JellyfinString no longer builds:');
        removed.forEach(function (k) { console.log('    ' + k); });
    }
    if (reworded.length) {
        console.log('  Reworded keys. A plugin\'s local string can now match one of these:');
        reworded.forEach(function (k) { console.log('    ' + k + ': "' + before[k] + '" -> "' + after[k] + '"'); });
    }
}

// MARK: moveTestPackages
// Points the test project's Jellyfin packages at the new Jellyfin version.
// Param: version | major.minor
function moveTestPackages(version) {
    var text = readFileSync(testProject, 'utf8');
    var moved = text.replace(/(<PackageReference Include="Jellyfin\.(?:Controller|Model)" Version=")[^"]+(")/g, '$1' + version + '.0$2');
    if (moved !== text) {
        writeFileSync(testProject, moved);
        console.log('Moved the test project\'s Jellyfin.Controller and Jellyfin.Model to ' + version + '.0.');
    }
}

// MARK: main
// Checks the tags, writes the pin, fetches, and reports.
function main() {
    var pin = readPin();
    var next = parseArgs(pin);
    ['web', 'server'].forEach(function (name) {
        if (!tagExists(SOURCES[name].repo, next.strings[name])) fail(SOURCES[name].repo + ' has no tag ' + next.strings[name] + '.');
    });

    var before = { web: english('web'), server: english('server') };
    writeFileSync(pinPath, JSON.stringify(next, null, 2) + '\n');
    var source = fetchStrings(next);
    console.log('jellyfin.json: Jellyfin ' + next.jellyfin + ', web strings ' + source.web.tag + ', server strings ' + source.server.tag + '.');
    report('Web client', before.web, english('web'));
    report('Server', before.server, english('server'));

    if (next.jellyfin !== pin.jellyfin) {
        moveTestPackages(next.jellyfin);
        console.log('\nThe next release is ' + next.jellyfin + '.0. Raise targetAbi and the Jellyfin packages in each plugin as it moves to this Base.');
    }
    console.log('\nRun the checks and tests, then build a plugin against scripts/pack.sh before you release.');
}

main();
