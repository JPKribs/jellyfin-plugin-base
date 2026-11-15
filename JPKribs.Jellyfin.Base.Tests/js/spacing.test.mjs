// Checks that every gap and margin in the kit CSS is one of the two spacing tokens, per Two spacings in skills/style.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var cssDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'css');
var PROP = /(?:^|[\s;{])(gap|row-gap|column-gap|margin|margin-top|margin-bottom|margin-left|margin-right)\s*:\s*([^;}]+)/g;
var LENGTH = /(?<![\w.(-])(\d*\.?\d+)(px|em|rem)\b/g;

test('every gap and margin is a spacing token, zero, auto, or a nudge under 4px', function () {
    var found = [];
    readdirSync(cssDir).filter(function (f) { return f.endsWith('.css') && f !== 'design-tokens.css'; }).forEach(function (file) {
        var text = readFileSync(join(cssDir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
        var m;
        while ((m = PROP.exec(text))) {
            var value = m[2].replace(/calc\([^)]*\)/g, '');
            var n;
            while ((n = LENGTH.exec(value))) {
                var px = parseFloat(n[1]) * (n[2] === 'px' ? 1 : 16);
                if (px > 3) found.push(file + ': ' + m[1] + ': ' + m[2].trim());
            }
        }
    });
    assert.deepEqual(found, []);
});

test('the two spacing tokens are narrow 8px and wide 16px', function () {
    var tokens = readFileSync(join(cssDir, 'design-tokens.css'), 'utf8');
    assert.match(tokens, /--base-gap-narrow: 8px;/);
    assert.match(tokens, /--base-gap-wide: 16px;/);
});
