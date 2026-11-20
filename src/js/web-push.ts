import { baseText } from './lib/base-text.js';
import { pushState, pushSubscribe, pushUnsubscribe, pushLabel } from './lib/push.js';

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
    return pushState(registration).then(result);
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
    return pushSubscribe(options).then(result);
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
    return pushUnsubscribe(options).then(result);
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
    return pushLabel(userAgent);
}

function result(state: WebPushState): WebPushResult {
    return { state: state, message: webPushText(state) };
}
