import { make, fill, toText } from './lib/dom.js';
import { escapeHtml } from './browser-helpers.js';
import { baseText } from './lib/base-text.js';
import type { ComponentHandle } from './types.js';

/** A channel a notification goes to, by name or by BaseNotifier's number. */
export type NotifyChannelName = 'Discord' | 'Webhook' | 'Jellyfin' | 'WebPush' | 0 | 1 | 2 | 3;

/** What BaseNotifier.Preview returns for one destination, with its keys in PascalCase as Jellyfin's API writes them, or in camelCase. */
export interface NotifyPreviewData {
    Channel?: NotifyChannelName;
    Method?: string;
    ContentType?: string;
    Body?: string;
    Discord?: unknown;
    Header?: string;
    Text?: string;
    Error?: string;
    channel?: NotifyChannelName;
    method?: string;
    contentType?: string;
    body?: string;
    discord?: unknown;
    header?: string;
    text?: string;
    error?: string;
}

/** What createNotifyPreview takes. The texts replace the default words, and now is the time a Discord post shows. */
export interface NotifyPreviewOptions {
    preview?: NotifyPreviewData | null;
    username?: string;
    addressText?: string;
    site?: string;
    now?: Date;
}

/** What createNotifyPreview returns. setPreview draws another preview in its place. */
export interface NotifyPreviewHandle extends ComponentHandle {
    setPreview(preview: NotifyPreviewData | null | undefined): void;
    destroy(): void;
}

/**
 * Draws what one destination gets for a message, from the preview BaseNotifier returns: a Discord post as Discord's dark theme shows
 * it, a webhook's request line over its body, a Jellyfin message as the web client's toast, or a web push as a browser notification.
 * A preview with an error shows the error.
 *
 * @param options {
 *   preview     : the preview from BaseNotifier.Preview [optional]
 *   username    : the name a Discord post comes from when its body names none (default 'Jellyfin')
 *   addressText : the address a webhook's request line shows, since the stored address never reaches the page (default 'Saved address')
 *   site        : the site a web push names under its text (default the page's host)
 *   now         : the time a Discord post shows (default the time it is drawn)
 * }
 * @returns { element, setPreview, destroy }
 */
export function createNotifyPreview(options?: NotifyPreviewOptions): NotifyPreviewHandle {
    options = options || {};
    var root = make('div', 'base-notify-preview');

    function setPreview(preview: NotifyPreviewData | null | undefined): void {
        root.textContent = '';
        if (!preview) return;
        var error = pick(preview, 'Error');
        var node = error ? message(error)
            : channelOf(preview) === 'Discord' ? discordPost(preview, options!)
            : channelOf(preview) === 'Jellyfin' ? jellyfinToast(preview)
            : channelOf(preview) === 'WebPush' ? webPushNotice(preview, options!)
            : webhookRequest(preview, options!);
        root.appendChild(node);
    }

    setPreview(options.preview);
    return {
        element: root,
        setPreview: setPreview,
        destroy: function () { root.textContent = ''; }
    };
}

var CHANNELS = ['Discord', 'Webhook', 'Jellyfin', 'WebPush'];

// The channel's name, from its name or number.
function channelOf(preview: NotifyPreviewData): string {
    var channel = preview.Channel !== undefined ? preview.Channel : preview.channel;
    return typeof channel === 'number' ? CHANNELS[channel] || 'Webhook' : toText(channel) || 'Webhook';
}

// A string field, read from its PascalCase or camelCase key.
function pick(preview: NotifyPreviewData, key: 'Method' | 'ContentType' | 'Body' | 'Header' | 'Text' | 'Error'): string {
    var p = preview as Record<string, unknown>;
    var value = p[key] !== undefined ? p[key] : p[key.charAt(0).toLowerCase() + key.slice(1)];
    return toText(value);
}

function message(text: string): HTMLElement {
    return make('div', 'base-error', null, text);
}

// A webhook's request line, its method and content type beside the saved address, over the body exactly as sent, laid out when it is JSON.
function webhookRequest(preview: NotifyPreviewData, options: NotifyPreviewOptions): HTMLElement {
    var body = pick(preview, 'Body');
    try { body = JSON.stringify(JSON.parse(body), null, 2); } catch (e) { /* not JSON, so shown as sent */ }
    var el = make('div', 'base-notify-preview-webhook');
    var line = make('div', 'base-notify-preview-line');
    line.appendChild(make('span', 'base-notify-preview-method', null, pick(preview, 'Method') || 'POST'));
    line.appendChild(make('span', 'base-notify-preview-address', null, options.addressText || baseText('Base.SavedAddress')));
    line.appendChild(make('span', 'base-notify-preview-type', null, pick(preview, 'ContentType')));
    el.appendChild(line);
    el.appendChild(make('pre', 'base-code base-code-block base-notify-preview-body', null, body));
    return el;
}

// The web client shows a message from the server as its toast with the text alone, so the header is named under it.
function jellyfinToast(preview: NotifyPreviewData): HTMLElement {
    var header = pick(preview, 'Header');
    var el = make('div', 'base-notify-preview-jellyfin');
    var screen = make('div', 'base-notify-preview-screen');
    screen.appendChild(make('div', 'base-notify-preview-toast base-float', null, pick(preview, 'Text')));
    el.appendChild(screen);
    el.appendChild(make('div', 'fieldDescription', null, header ? fill(baseText('Base.ToastHeaderNote'), header) : baseText('Base.ToastNote')));
    return el;
}

// A browser notification: the icon, the title, the text, the site, and the image.
function webPushNotice(preview: NotifyPreviewData, options: NotifyPreviewOptions): HTMLElement {
    var data: Record<string, unknown> = {};
    try { data = JSON.parse(pick(preview, 'Body')) || {}; } catch (e) { data = {}; }
    var el = make('div', 'base-notify-preview-push base-float');
    if (safeUrl(data.icon)) el.appendChild(make('img', 'base-notify-preview-push-icon', { alt: '', src: safeUrl(data.icon) }));
    var text = make('div', 'base-notify-preview-push-text');
    text.appendChild(make('div', 'base-notify-preview-push-title', null, toText(data.title)));
    if (data.body) text.appendChild(make('div', 'base-notify-preview-push-body', null, toText(data.body)));
    text.appendChild(make('div', 'base-notify-preview-push-site', null, options.site || (typeof location !== 'undefined' ? location.host : '')));
    if (safeUrl(data.image)) text.appendChild(make('img', 'base-notify-preview-push-image', { alt: '', src: safeUrl(data.image) }));
    el.appendChild(text);
    return el;
}

// A Discord post in Discord's dark theme: the avatar, name, app tag, and time, any text, and each embed with its color bar, author,
// linked title, description, fields, thumbnail, image, and footer. Discord's own markdown in the text is drawn as Discord draws it.
function discordPost(preview: NotifyPreviewData, options: NotifyPreviewOptions): HTMLElement {
    var post: any = preview.Discord !== undefined ? preview.Discord : preview.discord;
    if (!post || typeof post !== 'object') {
        try { post = JSON.parse(pick(preview, 'Body')); } catch (e) { return message(baseText('Base.NotifyDiscordJson')); }
    }
    if (!post || typeof post !== 'object') return message(baseText('Base.NotifyDiscordJson'));
    var name = toText(post.username || options.username || 'Jellyfin');
    var el = make('div', 'base-notify-preview-discord');
    var avatar = safeUrl(post.avatar_url);
    el.innerHTML = '<div class="base-notify-preview-discord-avatar" aria-hidden="true">'
        + (avatar ? '<img alt="" src="' + escapeHtml(avatar) + '">' : escapeHtml(name.charAt(0).toUpperCase())) + '</div>'
        + '<div class="base-notify-preview-discord-content">'
        + '<div class="base-notify-preview-discord-header"><span class="base-notify-preview-discord-name">' + escapeHtml(name) + '</span>'
        + '<span class="base-notify-preview-discord-tag">' + escapeHtml(baseText('HeaderApp')) + '</span>'
        + '<span class="base-notify-preview-discord-time">' + escapeHtml(discordTime(options.now || new Date(), options.now)) + '</span></div>'
        + (post.content ? '<div class="base-notify-preview-discord-text">' + discordMarkdown(toText(post.content)) + '</div>' : '')
        + (Array.isArray(post.embeds) ? post.embeds : []).map(function (embed: any) { return discordEmbed(embed, options); }).join('')
        + '</div>';
    return el;
}

function discordEmbed(embed: any, options: NotifyPreviewOptions): string {
    if (!embed || typeof embed !== 'object') return '';
    var color = typeof embed.color === 'number' ? '#' + ('000000' + (embed.color & 0xFFFFFF).toString(16)).slice(-6) : '';
    var author = embed.author && embed.author.name ? '<div class="base-notify-preview-discord-author">'
        + (safeUrl(embed.author.icon_url) ? '<img alt="" src="' + escapeHtml(safeUrl(embed.author.icon_url)) + '">' : '') + '<span>' + escapeHtml(embed.author.name) + '</span></div>' : '';
    var title = embed.title ? '<div class="base-notify-preview-discord-title' + (embed.url ? ' linked' : '') + '">' + discordMarkdown(toText(embed.title)) + '</div>' : '';
    var text = embed.description ? '<div class="base-notify-preview-discord-description">' + discordMarkdown(toText(embed.description)) + '</div>' : '';
    var fields = (Array.isArray(embed.fields) ? embed.fields : []).filter(function (f: any) { return f && (f.name || f.value); });
    var footerText = embed.footer && embed.footer.text ? escapeHtml(embed.footer.text) : '';
    var stamp = embed.timestamp ? escapeHtml(discordTime(new Date(embed.timestamp), options.now)) : '';
    var footer = footerText || stamp ? '<div class="base-notify-preview-discord-footer">'
        + (embed.footer && safeUrl(embed.footer.icon_url) ? '<img alt="" src="' + escapeHtml(safeUrl(embed.footer.icon_url)) + '">' : '')
        + '<span>' + footerText + (footerText && stamp ? '<span class="base-notify-preview-discord-dot">•</span>' : '') + stamp + '</span></div>' : '';
    var thumbnail = embed.thumbnail && safeUrl(embed.thumbnail.url);
    var image = embed.image && safeUrl(embed.image.url);
    // The embed's color comes from the post, as the custom color its bar reads.
    return '<article class="base-notify-preview-discord-embed' + (color ? ' custom" style="--base-custom: ' + color : '') + '">'
        + '<div class="base-notify-preview-discord-grid' + (thumbnail ? ' thumbnail' : '') + '">'
        + '<div class="base-notify-preview-discord-main">' + author + title + text
        + (fields.length ? '<div class="base-notify-preview-discord-fields">' + discordFields(fields) + '</div>' : '')
        + (image ? '<img class="base-notify-preview-discord-image" alt="" src="' + escapeHtml(image) + '">' : '')
        + footer + '</div>'
        + (thumbnail ? '<img class="base-notify-preview-discord-thumbnail" alt="" src="' + escapeHtml(thumbnail) + '">' : '')
        + '</div></article>';
}

// Discord sets inline fields up to three to a row, in equal parts of the row, and a field that is not inline on a row of its own.
function discordFields(fields: any[]): string {
    var out = '';
    var row: any[] = [];
    function flush(): void {
        row.forEach(function (f) {
            out += '<div class="base-notify-preview-discord-field" data-span="' + (12 / row.length) + '">'
                + '<div class="base-notify-preview-discord-field-name">' + discordMarkdown(toText(f.name)) + '</div>'
                + '<div class="base-notify-preview-discord-field-value">' + discordMarkdown(toText(f.value)) + '</div></div>';
        });
        row = [];
    }
    fields.forEach(function (f) {
        if (!f.inline) {
            flush();
            row = [f];
            flush();
            return;
        }
        row.push(f);
        if (row.length === 3) flush();
    });
    flush();
    return out;
}

/**
 * How Discord writes a time: today's and yesterday's by the day, and others by the date.
 *
 * @param when the time
 * @param now the time it is now (default the time it is called)
 */
export function discordTime(when: Date, now?: Date): string {
    if (isNaN(when.getTime())) return '';
    var clock = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    var day = new Date(when.getFullYear(), when.getMonth(), when.getDate());
    var today = now ? new Date(now.getTime()) : new Date();
    today.setHours(0, 0, 0, 0);
    var days = Math.round((today.getTime() - day.getTime()) / 86400000);
    if (days === 0) return fill(baseText('Base.DiscordToday'), clock);
    if (days === 1) return fill(baseText('Base.DiscordYesterday'), clock);
    return when.toLocaleDateString() + ' ' + clock;
}

/**
 * Draws the part of Discord's markdown a post uses as HTML: escaped characters shown as typed, code, bold, underline, italics,
 * strikethrough, and masked links, which show as link colored text and never as a link. Everything is escaped for HTML first.
 *
 * @param text the text, as the post carries it
 */
export function discordMarkdown(text: string): string {
    var kept: string[] = [];
    var held = String(text).replace(/\\([\\*_~`|[\]()>#<@])/g, function (all: string, c: string) {
        kept.push(c);
        return '\u0001' + (kept.length - 1) + '\u0002';
    });
    var out = escapeHtml(held)
        .replace(/`([^`]+)`/g, '<code class="base-notify-preview-discord-code">$1</code>')
        .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
        .replace(/\*([^*\s][\s\S]*?)\*/g, '<em>$1</em>')
        .replace(/\b_([^_]+)_\b/g, '<em>$1</em>')
        .replace(/~~([\s\S]+?)~~/g, '<s>$1</s>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<span class="base-notify-preview-discord-link">$1</span>');
    return out.replace(/\u0001(\d+)\u0002/g, function (all: string, i: string) { return escapeHtml(kept[Number(i)]); });
}

// An http or https address, or '' for anything else, so a preview never loads another scheme.
function safeUrl(value: unknown): string {
    var text = toText(value).trim();
    return /^https?:\/\//i.test(text) ? text : '';
}
