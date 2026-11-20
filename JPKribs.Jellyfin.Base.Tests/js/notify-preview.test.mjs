// Behavior tests for createNotifyPreview and the Discord helpers behind it, run on the stub DOM in fake-dom.mjs.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';

installFakeDom();
var { createNotifyPreview, discordMarkdown, discordTime } = await import('../../src/js/notify-preview.js');
var { setCurrentTranslations } = await import('../../src/js/lib/base-text.js');

beforeEach(function () {
    installFakeDom();
    setCurrentTranslations(null);
});

function text(root, selector) {
    var el = root.querySelector(selector);
    return el ? el.textContent : null;
}

test('a webhook preview shows the request line over the body, laid out when it is JSON', function () {
    var preview = createNotifyPreview({ preview: { Channel: 'Webhook', Method: 'POST', ContentType: 'application/json', Body: '{"title":"Approved","n":1}' } });
    assert.equal(text(preview.element, '.base-notify-preview-method'), 'POST');
    assert.equal(text(preview.element, '.base-notify-preview-address'), 'Saved address');
    assert.equal(text(preview.element, '.base-notify-preview-type'), 'application/json');
    assert.equal(text(preview.element, '.base-notify-preview-body'), '{\n  "title": "Approved",\n  "n": 1\n}');

    preview.setPreview({ channel: 1, contentType: 'text/plain', body: 'Dune was approved.' });
    assert.equal(text(preview.element, '.base-notify-preview-body'), 'Dune was approved.');
    assert.equal(text(preview.element, '.base-notify-preview-method'), 'POST');
});

test('a Jellyfin preview shows the text as the toast and names the header under it', function () {
    var preview = createNotifyPreview({ preview: { Channel: 'Jellyfin', Header: 'Approved', Text: 'Dune was approved.' } });
    assert.equal(text(preview.element, '.base-notify-preview-toast'), 'Dune was approved.');
    assert.equal(text(preview.element, '.fieldDescription'), 'The web client shows the text. Apps that show a title show Approved above it.');
    preview.setPreview({ Channel: 2, Text: 'Hi' });
    assert.equal(text(preview.element, '.fieldDescription'), 'The web client shows the text.');
});

test('a preview with an error shows the error, and no preview shows nothing', function () {
    var preview = createNotifyPreview({ preview: { Channel: 'Discord', Error: 'Discord needs a JSON body.' } });
    assert.equal(text(preview.element, '.base-error'), 'Discord needs a JSON body.');
    preview.setPreview(null);
    assert.equal(preview.element.children.length, 0);
});

test('a Discord preview draws the post from its data, with the embed color, fields in rows, and what people wrote shown as typed', function () {
    var post = {
        username: 'Media <Bot>',
        avatar_url: 'javascript:alert(1)',
        embeds: [{
            title: 'Approved: Dune',
            url: 'https://jf.example.com/',
            description: 'Dune \\(2021\\) was **approved**. [sign in](https://evil.example)',
            color: 0xF44336,
            fields: [{ name: 'A', value: '1', inline: true }, { name: 'B', value: '2', inline: true }, { name: 'C', value: '3', inline: true }, { name: 'Notes', value: 'x', inline: false }],
            thumbnail: { url: 'https://image.example/p.jpg' },
            image: { url: 'data:image/png;base64,AAAA' },
            timestamp: '2026-11-20T12:00:00Z'
        }]
    };
    var html = createNotifyPreview({ preview: { Channel: 'Discord', Discord: post }, now: new Date(2026, 10, 20, 18, 0) }).element.children[0].innerHTML;
    assert.match(html, /base-notify-preview-discord-name">Media &lt;Bot&gt;</);
    assert.match(html, /aria-hidden="true">M</);
    assert.doesNotMatch(html, /javascript:/);
    assert.match(html, /class="base-notify-preview-discord-embed custom" style="--base-custom: #f44336"/);
    assert.match(html, /base-notify-preview-discord-title linked">Approved: Dune</);
    assert.match(html, /Dune \(2021\) was <strong>approved<\/strong>\. <span class="base-notify-preview-discord-link">sign in<\/span>/);
    assert.equal((html.match(/data-span="4"/g) || []).length, 3);
    assert.equal((html.match(/data-span="12"/g) || []).length, 1);
    assert.match(html, /base-notify-preview-discord-thumbnail" alt="" src="https:\/\/image.example\/p.jpg"/);
    assert.doesNotMatch(html, /data:image/);
    assert.match(html, /base-notify-preview-discord-tag">App</);
});

test('a Discord preview reads the body when the data is missing, and says when the body is not JSON', function () {
    var html = createNotifyPreview({ preview: { Channel: 'Discord', Body: '{"content":"Hi *there*","embeds":[]}' }, username: 'Fallback' }).element.children[0].innerHTML;
    assert.match(html, /base-notify-preview-discord-text">Hi <em>there<\/em></);
    assert.match(html, /discord-name">Fallback</);
    var bad = createNotifyPreview({ preview: { Channel: 0, Body: 'not json' } });
    assert.equal(text(bad.element, '.base-error'), 'Discord needs a JSON body.');
});

test('Discord markdown escapes HTML, keeps escaped characters as typed, and never makes a link', function () {
    assert.equal(discordMarkdown('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
    assert.equal(discordMarkdown('\\*not italic\\* and \\[x\\]\\(https://a\\)'), '*not italic* and [x](https://a)');
    assert.equal(discordMarkdown('`code` ~~gone~~ __under__ _it_'), '<code class="base-notify-preview-discord-code">code</code> <s>gone</s> <u>under</u> <em>it</em>');
    assert.doesNotMatch(discordMarkdown('[a](https://b)'), /<a /);
});

test('Discord writes today\'s and yesterday\'s times by the day, in the page\'s language', function () {
    var now = new Date(2026, 10, 20, 18, 0);
    assert.match(discordTime(new Date(2026, 10, 20, 9, 5), now), /^Today at /);
    assert.match(discordTime(new Date(2026, 10, 19, 9, 5), now), /^Yesterday at /);
    assert.doesNotMatch(discordTime(new Date(2026, 10, 1, 9, 5), now), /at/);
    assert.equal(discordTime(new Date('nope'), now), '');
    setCurrentTranslations({ language: 'de', has: function (k) { return k === 'Base.DiscordToday'; }, tr: function () { return 'Heute um {value}'; } });
    assert.match(discordTime(new Date(2026, 10, 20, 9, 5), now), /^Heute um /);
});

test('a web push preview shows the notification with its title, text, site, and http images only', function () {
    var preview = createNotifyPreview({ preview: { Channel: 'WebPush', Body: JSON.stringify({ title: 'Approved', body: 'Dune', icon: 'https://x/i.png', image: 'file:///etc/passwd' }) }, site: 'jf.example.com' });
    assert.equal(text(preview.element, '.base-notify-preview-push-title'), 'Approved');
    assert.equal(text(preview.element, '.base-notify-preview-push-body'), 'Dune');
    assert.equal(text(preview.element, '.base-notify-preview-push-site'), 'jf.example.com');
    assert.equal(preview.element.querySelector('.base-notify-preview-push-icon').getAttribute('src'), 'https://x/i.png');
    assert.equal(preview.element.querySelector('.base-notify-preview-push-image'), null);
});
