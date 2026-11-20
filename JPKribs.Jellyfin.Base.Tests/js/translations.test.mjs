// Tests for the translations helpers: the handle, the markup pass, the viewer's language, and the endpoint load, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

var dom = installFakeDom();
var { loadTranslations, createTranslations, applyTranslations, currentLanguage, formatText } = await import('../../src/js/index.js');

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
