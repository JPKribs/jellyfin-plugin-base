// Tests for the translations helpers: the handle, the markup pass, the viewer's language, and the endpoint load, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { loadTranslations, createTranslations, applyTranslations, currentLanguage, formatText, titleCase, sentenceCase, currentTranslations } = await import('../../src/js/index.js');
var { setCurrentTranslations, baseText, BASE_TEXT } = await import('../../src/js/lib/base-text.js');
var fs = await import('node:fs');
var casingCases = JSON.parse(fs.readFileSync(new URL('../Fixtures/casing-cases.json', import.meta.url), 'utf8'));

var store = {};
var requests = [];
var answers = {};
var realNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setLanguage(language) {
    Object.defineProperty(globalThis, 'navigator', { value: { language: language, languages: [language] }, configurable: true, writable: true });
}

beforeEach(function () {
    dom = installFakeDom();
    store = {};
    requests = [];
    answers = {};
    globalThis.localStorage = {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
        setItem: function (k, v) { store[k] = String(v); }
    };
    globalThis.fetch = function (url, init) {
        requests.push({ url: url, init: init });
        var answer = answers[url];
        if (answer instanceof Error) return Promise.reject(answer);
        return Promise.resolve({ ok: answer !== undefined, json: function () { return Promise.resolve(answer); } });
    };
    delete globalThis.ApiClient;
    setLanguage('en-US');
    setCurrentTranslations(null);
});

afterEach(function () {
    if (realNavigator) Object.defineProperty(globalThis, 'navigator', realNavigator);
});

test('formatText fills numbered placeholders in any order and keeps one with no value', function () {
    assert.equal(formatText('{0} of {1} left', 3, 5), '3 of 5 left');
    assert.equal(formatText('{1} before {0}', 'a', 'b'), 'b before a');
    assert.equal(formatText('{0} and {2}', 'x'), 'x and {2}');
    assert.equal(formatText('{0}', null), '{0}');
    assert.equal(formatText('no braces', 1), 'no braces');
    assert.equal(formatText('{name} stays', 1), '{name} stays');
});

test('createTranslations reads a string, falls back to the given text, then to the key, and formats', function () {
    var t = createTranslations({ Favorites: 'Favoriten', QuotaLeft: '{0} von {1} übrig', Empty: '' }, 'de');
    assert.equal(t.language, 'de');
    assert.equal(t.tr('Favorites'), 'Favoriten');
    assert.equal(t.tr('Missing', 'Fallback'), 'Fallback');
    assert.equal(t.tr('Missing'), 'Missing');
    assert.equal(t.tr('Empty', 'Fallback'), '');
    assert.equal(t.tr('constructor', 'Safe'), 'Safe');
    assert.equal(t.format('QuotaLeft', 2, 4), '2 von 4 übrig');
    assert.equal(t.has('Favorites'), true);
    assert.equal(t.has('toString'), false);
    assert.equal(createTranslations(null).language, 'en-us');
});

test('applyTranslations sets text, title, aria-label, and placeholder, and keeps markup whose key has no string', function () {
    var root = document.createElement('div');
    var heading = document.createElement('h2');
    heading.setAttribute('data-str', 'MyRequests');
    heading.textContent = 'My Requests';
    var kept = document.createElement('span');
    kept.setAttribute('data-str', 'Unknown');
    kept.textContent = 'English';
    var button = document.createElement('button');
    button.setAttribute('data-str-title', 'Search');
    button.setAttribute('data-str-label', 'Search');
    var input = document.createElement('input');
    input.setAttribute('data-str-placeholder', 'Search');
    [heading, kept, button, input].forEach(function (n) { root.appendChild(n); });
    document.body.appendChild(root);

    var t = createTranslations({ MyRequests: 'Meine Anfragen', Search: 'Suche' }, 'de');
    applyTranslations(t, root);
    assert.equal(heading.textContent, 'Meine Anfragen');
    assert.equal(kept.textContent, 'English');
    assert.equal(button.title, 'Suche');
    assert.equal(button.getAttribute('aria-label'), 'Suche');
    assert.equal(input.getAttribute('placeholder'), 'Suche');

    heading.textContent = 'reset';
    createTranslations({ MyRequests: 'Mes demandes' }, 'fr').apply();
    assert.equal(heading.textContent, 'Mes demandes');
});

test('currentLanguage takes the display setting, else the browser language, in lower case with a hyphen', function () {
    assert.equal(currentLanguage(), 'en-us');
    setLanguage('pt_BR');
    assert.equal(currentLanguage(), 'pt-br');
    store['user-1-language'] = 'de';
    assert.equal(currentLanguage('user-1'), 'de');
    assert.equal(currentLanguage('user-2'), 'pt-br');
    globalThis.ApiClient = { getUrl: function (p) { return '/base/' + p; }, getCurrentUserId: function () { return 'user-1'; } };
    assert.equal(currentLanguage(), 'de');
    globalThis.localStorage = { getItem: function () { throw new Error('blocked'); } };
    assert.equal(currentLanguage(), 'pt-br');
});

test('loadTranslations asks the endpoint for the language once and builds a handle from the answer', async function () {
    answers['/MyPlugin/Translations?language=de'] = { MyRequests: 'Meine Anfragen' };
    var first = await loadTranslations('/MyPlugin/Translations', { language: 'de' });
    var second = await loadTranslations('/MyPlugin/Translations', { language: 'DE' });
    assert.equal(first.tr('MyRequests'), 'Meine Anfragen');
    assert.equal(first.language, 'de');
    assert.equal(second, first);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].init.headers.Accept, 'application/json');
});

test('loadTranslations sends a relative address through ApiClient.getUrl and adds to a query that is there', async function () {
    globalThis.ApiClient = { getUrl: function (p) { return 'http://server/base/' + p; } };
    answers['http://server/base/Other/Translations?v=2&language=fr'] = { A: 'a' };
    var t = await loadTranslations('Other/Translations?v=2', { language: 'fr' });
    assert.equal(t.tr('A'), 'a');
    answers['https://elsewhere/Strings?language=fr'] = { B: 'b' };
    assert.equal((await loadTranslations('https://elsewhere/Strings', { language: 'fr' })).tr('B'), 'b');
});

test('loadTranslations never rejects, falls back on a failed load, and asks again next time', async function () {
    answers['/Fail/Translations?language=es'] = new Error('offline');
    var failed = await loadTranslations('/Fail/Translations', { language: 'es' });
    assert.equal(failed.tr('Key', 'Fallback'), 'Fallback');
    await Promise.resolve();
    answers['/Fail/Translations?language=es'] = { Key: 'Clave' };
    var retried = await loadTranslations('/Fail/Translations', { language: 'es' });
    assert.equal(retried.tr('Key'), 'Clave');
    assert.equal(requests.length, 2);

    answers['/Bad/Translations?language=es'] = ['not', 'an', 'object'];
    assert.deepEqual((await loadTranslations('/Bad/Translations', { language: 'es' })).strings, {});
    assert.equal((await loadTranslations('/Missing/Translations', { language: 'es' })).tr('X', 'Y'), 'Y');
});

test('loadTranslations uses the viewer\'s language when none is given', async function () {
    store['viewer-language'] = 'nb';
    answers['/MyPlugin/Translations?language=nb'] = { Ok: 'Ja' };
    var t = await loadTranslations('/MyPlugin/Translations', { userId: 'viewer' });
    assert.equal(t.language, 'nb');
    assert.equal(t.tr('Ok'), 'Ja');
});

test('titleCase and sentenceCase give every shared case the result TextCase gives in C#', function () {
    casingCases.forEach(function (c) {
        var convert = c.case === 'title' ? titleCase : sentenceCase;
        assert.equal(convert(c.text, { exceptions: c.exceptions, language: c.language }), c.expected, c.case + ' ' + JSON.stringify(c.text));
    });
});

test('titleCase and sentenceCase add the casing list of the page\'s current translations', function () {
    assert.equal(titleCase('open the epg'), 'Open the Epg');
    setCurrentTranslations(createTranslations({}, 'en-us', ['EPG']));
    assert.equal(titleCase('open the epg'), 'Open the EPG');
    assert.equal(sentenceCase('Open The EPG Now', { exceptions: ['Now'] }), 'Open the EPG Now');
});

test('a handle reads a string in title case or sentence case in its own language, with its casing list', function () {
    var en = createTranslations({ Guide: 'open the epg guide', Shout: 'Open The EPG Guide' }, 'en-gb', ['EPG']);
    assert.deepEqual(en.casing.indexOf('EPG') !== -1 && en.casing.indexOf('TV') !== -1, true);
    assert.equal(en.title('Guide'), 'Open the EPG Guide');
    assert.equal(en.sentence('Shout'), 'Open the EPG guide');
    var de = createTranslations({ Guide: 'den Programmführer öffnen' }, 'de');
    assert.equal(de.title('Guide'), 'den Programmführer öffnen');
    assert.equal(de.sentence('Guide'), 'den Programmführer öffnen');
});

test('loadTranslations reads the strings and casing list Serve answers with, and still takes plain strings', async function () {
    answers['/Wrapped/Translations?language=de'] = { language: 'de', strings: { Favorites: 'Favoriten', strings: 'kept' }, casing: ['EPG', 3] };
    var t = await loadTranslations('/Wrapped/Translations', { language: 'de' });
    assert.equal(t.tr('Favorites'), 'Favoriten');
    assert.equal(t.tr('strings'), 'kept');
    assert.ok(t.casing.indexOf('EPG') !== -1);
    assert.ok(t.casing.every(function (w) { return typeof w === 'string'; }));

    answers['/Other/Translations?language=fr'] = { Favorites: 'Favoris', strings: 'a key named strings' };
    var plain = await loadTranslations('/Other/Translations', { language: 'fr' });
    assert.equal(plain.tr('Favorites'), 'Favoris');
    assert.equal(plain.tr('strings'), 'a key named strings');
});

test('loadTranslations makes the handle the page\'s current translations, and a failed load keeps the last one', async function () {
    assert.equal(currentTranslations(), null);
    answers['/Mine/Translations?language=de'] = { strings: { 'Base.LoadMore': 'Mehr laden' }, casing: [] };
    var t = await loadTranslations('/Mine/Translations', { language: 'de' });
    assert.equal(currentTranslations(), t);
    await loadTranslations('/Broken/Translations', { language: 'de' });
    assert.equal(currentTranslations(), t);
});

test('Base\'s own text reads the current translations at the time it is drawn, else US English', function () {
    assert.equal(baseText('Base.LoadMore'), 'Load more');
    setCurrentTranslations(createTranslations({ 'Base.LoadMore': 'Mehr laden', 'ButtonCancel': 'Abbrechen' }, 'de'));
    assert.equal(baseText('Base.LoadMore'), 'Mehr laden');
    assert.equal(baseText('ButtonCancel'), 'Abbrechen');
    assert.equal(baseText('Base.LoadAll'), 'Load all');
});

test('Base\'s own text in the bundle is the text strings/ ships to every plugin', function () {
    var local = JSON.parse(fs.readFileSync(new URL('../../strings/en-us.json', import.meta.url), 'utf8'));
    var declared = JSON.parse(fs.readFileSync(new URL('../../strings/jellyfin.json', import.meta.url), 'utf8'));
    var jellyfin = JSON.parse(fs.readFileSync(new URL('../../dist/jellyfin/web/en-us.json', import.meta.url), 'utf8'));
    var keys = Object.keys(BASE_TEXT);
    keys.filter(function (k) { return k.indexOf('Base.') === 0; }).forEach(function (k) {
        assert.equal(local[k], BASE_TEXT[k], k);
    });
    assert.deepEqual(keys.filter(function (k) { return k.indexOf('Base.') !== 0; }).sort(), declared.strings.map(function (d) { return d.key; }).sort());
    declared.strings.forEach(function (d) {
        var english = d.case === 'sentence' ? sentenceCase(jellyfin[d.key]) : d.case === 'title' ? titleCase(jellyfin[d.key]) : jellyfin[d.key];
        assert.equal(BASE_TEXT[d.key], english, d.key);
    });
});

test('every key of Base\'s own text is drawn by some component', function () {
    var dir = new URL('../../src/js/', import.meta.url);
    var sources = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.ts'); }).map(function (f) { return fs.readFileSync(new URL(f, dir), 'utf8'); })
        .concat(fs.readdirSync(new URL('lib/', dir)).filter(function (f) { return f.endsWith('.ts') && f !== 'base-text.ts'; }).map(function (f) { return fs.readFileSync(new URL('lib/' + f, dir), 'utf8'); }))
        .join('\n');
    assert.deepEqual(Object.keys(BASE_TEXT).filter(function (k) { return sources.indexOf("'" + k + "'") === -1; }), []);
});
