// Tests for the standalone page script BasePageScript serves, run from the C# source's text in a sandbox with no DOM and no bundle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

var { buildPageScript, pageScriptSource } = await import('../../scripts/build-page-script.mjs');
var casingCases = JSON.parse(fs.readFileSync(new URL('../Fixtures/casing-cases.json', import.meta.url), 'utf8'));
var source = fs.readFileSync(new URL('../../src/BasePageScript.cs', import.meta.url), 'utf8');

var KEY = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
var CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
var IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';

// The script BasePageScript.Script holds, read from between its raw string's quotes.
function served() {
    var open = source.match(/Script = ("{3,})\n/);
    var start = open.index + open[0].length;
    var end = source.indexOf('\n        ' + open[1] + ';', start);
    return source.slice(start, end).split('\n').map(function (l) { return l.replace(/^ {8}/, ''); }).join('\n');
}

// Runs the script in a page of its own, with only what a browser gives, and returns its BasePage global.
function page(opts) {
    opts = opts || {};
    var asked = [];
    var context = {
        isSecureContext: opts.secure !== false,
        navigator: { userAgent: opts.ua || CHROME, maxTouchPoints: 0, serviceWorker: {} },
        atob: atob,
        matchMedia: function () { return { matches: false }; },
        Notification: {
            permission: opts.permission || 'default',
            requestPermission: function () { asked.push(true); context.Notification.permission = opts.answer || 'granted'; return Promise.resolve(opts.answer || 'granted'); }
        }
    };
    if (opts.push !== false) context.PushManager = function () {};
    context.window = context;
    vm.createContext(context);
    vm.runInContext(served(), context);
    return { base: context.BasePage, asked: asked };
}

function registration() {
    var state = { sub: null, subscribed: [] };
    state.reg = {
        pushManager: {
            getSubscription: function () { return Promise.resolve(state.sub); },
            subscribe: function (options) {
                state.subscribed.push(options);
                state.sub = { endpoint: 'https://push.example/new', options: {}, toJSON: function () { return { endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } }; }, unsubscribe: function () { state.sub = null; return Promise.resolve(true); } };
                return Promise.resolve(state.sub);
            }
        }
    };
    return state;
}

test('the served script is the current build of its sources', function () {
    assert.equal(source, pageScriptSource(buildPageScript()));
});

test('the script sets only BasePage, with no text of its own', function () {
    var base = page().base;
    assert.deepEqual(Object.keys(base).sort(), ['sentenceCase', 'subscribeWebPush', 'titleCase', 'unsubscribeWebPush', 'webPushLabel', 'webPushState']);
    assert.doesNotMatch(served(), /Notifications are|HTTPS\./);
});

test('web push resolves to state codes, insecure first', async function () {
    assert.equal(await page({ secure: false, push: false }).base.webPushState(), 'insecure');
    assert.equal(await page({ ua: IPHONE, push: false }).base.webPushState(), 'install');
    assert.equal(await page({ push: false }).base.webPushState(), 'unsupported');
    assert.equal(await page({ permission: 'denied' }).base.webPushState(), 'denied');
    assert.equal(await page().base.webPushState(registration().reg), 'off');
    assert.equal(page().base.webPushLabel(IPHONE), 'Safari · iPhone');
});

test('subscribing asks, subscribes with the key, saves, and resolves to on, and unsubscribing to off', async function () {
    var p = page();
    var reg = registration();
    var saved = [];
    var removed = [];
    assert.equal(await p.base.subscribeWebPush({ registration: reg.reg, publicKey: KEY, save: function (s) { saved.push(s); } }), 'on');
    assert.equal(p.asked.length, 1);
    assert.equal(reg.subscribed[0].applicationServerKey.length, 65);
    assert.deepEqual(JSON.parse(JSON.stringify(saved)), [{ endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' }, label: 'Chrome · macOS' }]);
    assert.equal(await p.base.unsubscribeWebPush({ registration: reg.reg, remove: function (s) { removed.push(s.endpoint); } }), 'off');
    assert.deepEqual(removed, ['https://push.example/new']);
    assert.equal(await page({ answer: 'denied' }).base.subscribeWebPush({ registration: registration().reg, publicKey: KEY }), 'denied');
});

test('casing follows the same rules as the bundle and TextCase, with the plugin\'s casing list', function () {
    var base = page().base;
    casingCases.forEach(function (c) {
        var convert = c.case === 'title' ? base.titleCase : base.sentenceCase;
        assert.equal(convert(c.text, c.exceptions, c.language), c.expected, c.case + ' ' + JSON.stringify(c.text));
    });
    assert.equal(base.titleCase('open the epg guide', ['EPG']), 'Open the EPG Guide');
    assert.equal(base.sentenceCase('Allow Media Playback On TV'), 'Allow media playback on TV');
    assert.equal(base.titleCase('allow media playback', null, 'de'), 'allow media playback');
});
