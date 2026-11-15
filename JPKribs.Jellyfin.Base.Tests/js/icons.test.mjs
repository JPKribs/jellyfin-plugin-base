// Checks that the components draw each arrow from the one icon its meaning takes, per the Icons table in skills/style.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The arrow and chevron icons the Icons table allows, and what each means.
var ALLOWED = {
    expand_more: 'opens or closes a section, card, or panel',
    keyboard_arrow_down: 'opens a dropdown, or moves an item or steps a number down',
    keyboard_arrow_up: 'moves an item or steps a number up',
    chevron_right: 'separates the levels of a trail, or opens a record from its row',
    arrow_upward: 'a rising trend, or the folder above',
    arrow_downward: 'a falling trend',
    arrow_forward: 'a route from one place to the next, turned down when the places stack'
};

function files(dir, ext) {
    var out = [];
    readdirSync(join(root, dir), { withFileTypes: true }).forEach(function (entry) {
        var path = join(dir, entry.name);
        if (entry.isDirectory()) out = out.concat(files(path, ext));
        else if (ext.some(function (e) { return entry.name.endsWith(e); })) out.push(path);
    });
    return out;
}

var sources = files('src', ['.ts', '.css']).concat(files('docs/previews', ['.html']), files('docs/components/web', ['.md']), ['JPKribs.Jellyfin.Base.Tests/gallery/index.html']);

test('no component draws an icon from a text character', function () {
    var found = [];
    sources.forEach(function (path) {
        var text = readFileSync(join(root, path), 'utf8');
        var m = text.match(/[▲▼▶◀▴▾▸◂►◄×✕✖↻⟳]|&times;|&#(9650|9660|9654|9664|9652|9662|9656|9658|9668|8635|10227|215);/g);
        if (m) found.push(path + ': ' + m.join(' '));
    });
    assert.deepEqual(found, []);
});

test('every arrow icon a component uses is the one its meaning takes', function () {
    var found = [];
    files('src/js', ['.ts']).forEach(function (path) {
        var text = readFileSync(join(root, path), 'utf8');
        (text.match(/\b(?:arrow|keyboard_arrow|expand|chevron|navigate)_[a-z_]+\b/g) || []).forEach(function (name) {
            if (!Object.prototype.hasOwnProperty.call(ALLOWED, name)) found.push(path + ': ' + name);
        });
    });
    assert.deepEqual(found, []);
});

test('the open state turns the chevron the same way in every component', function () {
    var collapsible = readFileSync(join(root, 'src/css/collapsible-section.css'), 'utf8');
    var card = readFileSync(join(root, 'src/js/sortable-card-list.ts'), 'utf8');
    assert.match(collapsible, /\.base-collapsible-icon \{[^}]*transform: rotate\(180deg\)/);
    assert.match(collapsible, /\.collapsed \.base-collapsible-icon,\s*\[aria-expanded="false"\] > \.base-collapsible-icon \{\s*transform: none;/);
    assert.match(card, /class="base-collapsible-icon base-card-item-chevron material-icons"/);
});

test('every chevron takes one of the two chevron sizes', function () {
    var rules = [
        ['src/css/collapsible-section.css', /\.base-collapsible-icon \{[^}]*font-size: var\(--base-chevron-primary\)/],
        ['src/css/form-fields.css', /background-size: calc\(var\(--base-chevron-primary\) \/ 4\)/],
        ['src/css/row-button.css', /\.base-row-btn\.move \.material-icons \{ font-size: var\(--base-chevron-secondary\)/],
        ['src/css/breadcrumbs.css', /\.base-breadcrumb > \.material-icons \{ font-size: var\(--base-chevron-secondary\)/]
    ];
    rules.forEach(function (rule) {
        assert.match(readFileSync(join(root, rule[0]), 'utf8'), rule[1], rule[0]);
    });
});

