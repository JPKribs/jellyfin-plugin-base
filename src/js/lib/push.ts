// push.ts
// The push core: where a page stands with web push, and subscribing and unsubscribing, as state codes with no text, so the
// Web Push component and the standalone page script share one behavior. Internal to the web components.
import type { WebPushState, WebPushOptions, WebPushSubscriptionJson } from '../web-push.js';

/**
 * Where a page stands with web push, without asking the person anything. Internal to the web components.
 *
 * @param registration the plugin's service worker registration, to read the current subscription [optional]
 */
export function pushState(registration?: ServiceWorkerRegistration | PromiseLike<ServiceWorkerRegistration> | null): Promise<WebPushState> {
    var early = blockedState();
    if (early) return Promise.resolve(early);
    if (Notification.permission === 'denied') return Promise.resolve('denied');
    if (!registration) return Promise.resolve('off');
    return Promise.resolve(registration).then(function (reg) {
        return reg.pushManager.getSubscription();
    }).then(function (sub): WebPushState {
        return sub && Notification.permission === 'granted' ? 'on' : 'off';
    });
}

/**
 * Asks for permission, subscribes with the VAPID public key, replacing a subscription made with another key, and calls save.
 * Internal to the web components.
 *
 * @param options { registration, publicKey, save }
 */
export function pushSubscribe(options: WebPushOptions): Promise<WebPushState> {
    var early = blockedState();
    if (early) return Promise.resolve(early);
    var key = urlBase64Bytes(options.publicKey || '');
    if (!key.length) return Promise.reject(new Error('publicKey is required'));
    return Promise.resolve(Notification.requestPermission()).then(function (permission): WebPushState | Promise<WebPushState> {
        if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
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
            return Promise.resolve(sent).then(function (): WebPushState { return 'on'; });
        });
    });
}

/**
 * Calls remove with the subscription, then removes it from the browser. Internal to the web components.
 *
 * @param options { registration, remove }
 */
export function pushUnsubscribe(options: WebPushOptions): Promise<WebPushState> {
    var early = blockedState();
    if (early) return Promise.resolve(early);
    return Promise.resolve(options.registration).then(function (reg) {
        return reg.pushManager.getSubscription();
    }).then(function (sub): WebPushState | Promise<WebPushState> {
        if (!sub) return 'off';
        var gone = options.remove ? options.remove(subscriptionJson(sub)) : null;
        return Promise.resolve(gone).then(function () { return sub.unsubscribe(); }).then(function (): WebPushState { return 'off'; });
    });
}

/**
 * A short name for the device a page runs on, such as "Safari · iPhone". Internal to the web components.
 *
 * @param userAgent the user agent to read (default navigator.userAgent)
 */
export function pushLabel(userAgent?: string): string {
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

function subscriptionJson(sub: PushSubscription): WebPushSubscriptionJson {
    var json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
    var keys = json.keys || {};
    return { endpoint: json.endpoint || sub.endpoint, keys: { p256dh: keys.p256dh || '', auth: keys.auth || '' }, label: pushLabel() };
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
 * The bytes of a base64url text, such as a VAPID public key, or no bytes when the text is not base64url. Internal to the web components.
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
