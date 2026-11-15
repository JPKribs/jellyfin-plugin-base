import { make, icon, iconButton, listen, runAll, has } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** The tone of a banner, which picks its tint and glyph. */
export type BannerKind = 'info' | 'success' | 'warn' | 'error' | 'neutral';

/** Where a banner remembers a dismissal, given by the caller so Base never touches browser storage itself. */
export interface BannerStorage {
    get?(key: string): unknown;
    set?(key: string, value: true): void;
}

/** What a banner's getValue returns, and the kind, title, and text its setValue takes. */
export interface BannerValue {
    kind?: BannerKind | string;
    title?: string;
    text?: string;
    dismissed?: boolean;
}

/** What createBanner takes. A key and a storage together remember a dismissal. */
export interface BannerOptions {
    kind?: BannerKind | string;
    title?: string;
    text?: string;
    dismissible?: boolean;
    dismissLabel?: string;
    key?: string;
    storage?: BannerStorage | null;
    onDismiss?(): void;
}

/** What createBanner returns. */
export interface BannerHandle extends ComponentHandle {
    getValue(): BannerValue;
    setValue(next: BannerValue): void;
    show(): void;
    dismiss(): void;
    destroy(): void;
}

var GLYPHS: Record<BannerKind, string> = { info: 'info', success: 'check_circle', warn: 'warning', error: 'error', neutral: 'info' };

/**
 * A callout with a Dismiss button. It remembers a dismissal only when the caller gives a key and a storage object, so Base never touches browser storage on its own.
 *
 * @param options {
 *   kind         : 'info', 'success', 'warn', 'error', or 'neutral' (default 'info')
 *   title        : bold first line [optional]
 *   text         : the message sentence [optional]
 *   dismissible  : false hides the button (default true)
 *   dismissLabel : title and aria-label of the button (default 'Dismiss')
 *   key          : name that identifies this banner in the storage [optional]
 *   storage      : { get: function(key), set: function(key, true) } that remembers a dismissal [optional]
 *   onDismiss    : function() called when the user dismisses it [optional]
 * }
 * @returns { element, getValue, setValue, show, dismiss, destroy }. getValue returns { kind, title, text, dismissed }, and setValue takes kind, title, and text.
 * With a key and a storage whose get(key) is true, the banner starts hidden.
 */
export function createBanner(options?: BannerOptions): BannerHandle {
    options = options || {};
    var kind: BannerKind = has(GLYPHS, options.kind as BannerKind) ? options.kind as BannerKind : 'info';
    var title: string = options.title || '';
    var text: string = options.text || '';
    var dismissed: boolean = false;
    var cleanups: Array<() => void> = [];

    var root = make('div', 'jpk-banner');
    var glyph = icon('');
    var body = make('div', 'jpk-banner-body');
    var titleEl = make('div', 'jpk-banner-title');
    var textEl = make('div', 'jpk-banner-text');
    body.appendChild(titleEl);
    body.appendChild(textEl);
    root.appendChild(glyph);
    root.appendChild(body);
    var close = iconButton('jpk-row-btn jpk-banner-close', 'close', options.dismissLabel || 'Dismiss');
    close.hidden = options.dismissible === false;
    root.appendChild(close);

    function reflect(): void {
        root.className = 'jpk-banner jpk-' + kind;
        glyph.textContent = GLYPHS[kind];
        titleEl.textContent = title;
        titleEl.hidden = !title;
        textEl.textContent = text;
        root.hidden = dismissed;
    }

    function dismiss(): void {
        dismissed = true;
        reflect();
        if (options!.key && options!.storage && options!.storage.set) options!.storage.set(options!.key, true);
        if (options!.onDismiss) options!.onDismiss();
    }

    if (options.key && options.storage && options.storage.get && options.storage.get(options.key)) dismissed = true;
    cleanups.push(listen(close, 'click', dismiss));
    reflect();

    return {
        element: root,
        getValue: function (): BannerValue { return { kind: kind, title: title, text: text, dismissed: dismissed }; },
        setValue: function (next: BannerValue): void {
            next = next || {};
            if (next.kind && has(GLYPHS, next.kind)) kind = next.kind as BannerKind;
            if (next.title !== undefined) title = next.title || '';
            if (next.text !== undefined) text = next.text || '';
            reflect();
        },
        show: function (): void { dismissed = false; reflect(); },
        dismiss: dismiss,
        destroy: function (): void { runAll(cleanups); }
    };
}
