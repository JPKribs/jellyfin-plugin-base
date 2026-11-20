import { baseText } from './lib/base-text.js';

/**
 * Where a page stands with web push. unsupported has no push in the browser, insecure is a page not on HTTPS, install is an iPhone or
 * iPad page not yet added to the home screen, denied is a person who blocked notifications, off has none yet, and on is subscribed.
 */
export type WebPushState = 'unsupported' | 'insecure' | 'install' | 'denied' | 'off' | 'on';

/** The subscription a page sends its plugin, as PushSubscription.toJSON gives it, with a short name for the device. */
export interface WebPushSubscriptionJson {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    label: string;
}

/** What subscribeWebPush and unsubscribeWebPush take. registration is the plugin's own service worker, and save and remove reach its endpoints. */
export interface WebPushOptions {
    registration: ServiceWorkerRegistration | PromiseLike<ServiceWorkerRegistration>;
    publicKey?: string;
    save?(subscription: WebPushSubscriptionJson): PromiseLike<unknown>;
    remove?(subscription: WebPushSubscriptionJson): PromiseLike<unknown>;
}

/** What subscribeWebPush, unsubscribeWebPush, and webPushState resolve to: the state, and its sentence for the person. */
export interface WebPushResult {
    state: WebPushState;
    message: string;
}

/**
 * Says where a page stands with web push, without asking the person anything. Push works only on a secure origin, HTTPS or localhost,
 * and an iPhone or iPad page only once it is added to the home screen.
 *
 * @param registration the plugin's service worker registration, to read the current subscription [optional]
 * @returns a promise of { state, message }
 */
export function webPushState(registration?: ServiceWorkerRegistration | PromiseLike<ServiceWorkerRegistration> | null): Promise<WebPushResult> {
    var early = blockedState();
    if (early) return Promise.resolve(result(early));
    if (Notification.permission === 'denied') return Promise.resolve(result('denied'));
    if (!registration) return Promise.resolve(result('off'));
    return Promise.resolve(registration).then(function (reg) {
        return reg.pushManager.getSubscription();
    }).then(function (sub) {
        return result(sub && Notification.permission === 'granted' ? 'on' : 'off');
    });
}

/**
 * Asks the person to allow notifications, subscribes the plugin's service worker with the server's VAPID public key, and sends the
 * subscription to the plugin through save. A subscription made with another key is replaced. Call it from a click, since browsers
 * ask only after a gesture.
 *
 * @param options {
 *   registration : the plugin's service worker registration, or a promise of it, such as navigator.serviceWorker.register('sw.js')
 *   publicKey    : the server's VAPID public key, base64url, from BaseNotifier.GetPublicKey
 *   save         : function(subscription) that sends { endpoint, keys, label } to the plugin and returns a promise [optional]
 *   remove       : not used to subscribe [optional]
 * }
 * @returns a promise of { state, message }, on once subscribed
 */
export function subscribeWebPush(options: WebPushOptions): Promise<WebPushResult> {
    var early = blockedState();
    if (early) return Promise.resolve(result(early));
    var key = urlBase64Bytes(options.publicKey || '');
    if (!key.length) return Promise.reject(new Error('publicKey is required'));
    return Promise.resolve(Notification.requestPermission()).then(function (permission) {
        if (permission !== 'granted') return result(permission === 'denied' ? 'denied' : 'off');
        return Promise.resolve(options.registration).then(function (reg) {
            return reg.pushManager.getSubscription().then(function (existing) {
                if (existing && !sameKey(existing, key)) {
                    return existing.unsubscribe().then(function () { return null; });
                }
                return existing;
            }).then(function (existing) {
                return existing || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource });
            });
        }).then(function (sub) {
            var sent = options.save ? options.save(subscriptionJson(sub)) : null;
            return Promise.resolve(sent).then(function () { return result('on'); });
        });
    });
}

/**
 * Removes the plugin's subscription from the plugin through remove, then from the browser.
 *
 * @param options {
 *   registration : the plugin's service worker registration, or a promise of it
 *   publicKey    : not used to unsubscribe [optional]
 *   save         : not used to unsubscribe [optional]
 *   remove       : function(subscription) that tells the plugin to forget it and returns a promise [optional]
 * }
 * @returns a promise of { state, message }, off once removed
 */
export function unsubscribeWebPush(options: WebPushOptions): Promise<WebPushResult> {
    var early = blockedState();
    if (early) return Promise.resolve(result(early));
    return Promise.resolve(options.registration).then(function (reg) {
        return reg.pushManager.getSubscription();
    }).then(function (sub) {
        if (!sub) return result('off');
        var gone = options.remove ? options.remove(subscriptionJson(sub)) : null;
        return Promise.resolve(gone).then(function () { return sub.unsubscribe(); }).then(function () { return result('off'); });
    });
}

/**
 * The sentence a page shows for a web push state, in the page's language.
 *
 * @param state the state
 */
export function webPushText(state: WebPushState): string {
    switch (state) {
        case 'unsupported': return baseText('Base.PushUnsupported');
        case 'insecure': return baseText('Base.PushNeedsHttps');
        case 'install': return baseText('Base.PushAddToHomeScreen');
        case 'denied': return baseText('Base.PushBlocked');
        case 'on': return baseText('Base.PushOn');
        default: return baseText('Base.PushOff');
    }
}

/**
 * A short name for the device a page runs on, such as "Safari · iPhone", for the plugin's list of subscriptions.
 *
 * @param userAgent the user agent to read (default navigator.userAgent)
 */
export function webPushLabel(userAgent?: string): string {
    var ua = userAgent == null ? (typeof navigator !== 'undefined' ? navigator.userAgent : '') : userAgent;
    var browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
        : /Chrome\//.test(ua) || /CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
    var system = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
        : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : '';
    return browser && system ? browser + ' · ' + system : browser || system;
}

// The state that stops push before anything is asked, or null when push may work.
function blockedState(): WebPushState | null {
    if (typeof window === 'undefined') return 'unsupported';
    if (window.isSecureContext === false) return 'insecure';
    var nav = typeof navigator !== 'undefined' ? navigator : null;
    if (appleMobile(nav) && !standalone(nav)) return 'install';
    if (!nav || !('serviceWorker' in nav) || typeof (window as any).PushManager === 'undefined' || typeof (window as any).Notification === 'undefined') return 'unsupported';
    return null;
}

// An iPhone or iPad, including an iPad that reports itself as a Mac with touch.
function appleMobile(nav: Navigator | null): boolean {
    if (!nav) return false;
    return /iPhone|iPad|iPod/.test(nav.userAgent || '') || (/Macintosh/.test(nav.userAgent || '') && (nav.maxTouchPoints || 0) > 1);
}

// Whether the page runs from the home screen, the only place Safari on an iPhone or iPad offers push.
function standalone(nav: Navigator | null): boolean {
    if (nav && (nav as any).standalone === true) return true;
    return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
}

function result(state: WebPushState): WebPushResult {
    return { state: state, message: webPushText(state) };
}

function subscriptionJson(sub: PushSubscription): WebPushSubscriptionJson {
    var json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
    var keys = json.keys || {};
    return { endpoint: json.endpoint || sub.endpoint, keys: { p256dh: keys.p256dh || '', auth: keys.auth || '' }, label: webPushLabel() };
}

// Whether a subscription was made with the given VAPID key.
function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
    var current = sub.options && sub.options.applicationServerKey;
    if (!current) return true;
    var bytes = new Uint8Array(current);
    if (bytes.length !== key.length) return false;
    for (var i = 0; i < bytes.length; i++) {
        if (bytes[i] !== key[i]) return false;
    }
    return true;
}

/**
 * The bytes of a base64url text, such as a VAPID public key, or no bytes when the text is not base64url.
 *
 * @param text the base64url text
 */
export function urlBase64Bytes(text: string): Uint8Array {
    var clean = String(text || '').trim().replace(/=+$/, '');
    if (!/^[A-Za-z0-9_-]*$/.test(clean)) return new Uint8Array(0);
    var base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    try {
        var raw = atob(base64);
        var out = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    } catch (e) {
        return new Uint8Array(0);
    }
}
