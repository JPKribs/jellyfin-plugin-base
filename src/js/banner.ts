import { make, icon, listen, runAll, has, clear } from './lib/dom.js';
import { MESSAGE_ICONS, dismissButton } from './lib/message.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

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

/** A button under a banner's text. primary draws it as the main action, and onClick gets the button, which it may disable while it works. */
export interface BannerAction {
    text: string;
    primary?: boolean;
    className?: string;
    onClick?(button: HTMLButtonElement): void;
}

/** What createBanner takes. A key and a storage together remember a dismissal, and actions are buttons under the text. */
export interface BannerOptions {
    kind?: BannerKind | string;
    title?: string;
    text?: string;
    dismissible?: boolean;
    dismissLabel?: string;
    key?: string;
    storage?: BannerStorage | null;
    actions?: BannerAction[] | null;
    onDismiss?(): void;
}

/** What createBanner returns. */
export interface BannerHandle extends ComponentHandle {
    getValue(): BannerValue;
    setValue(next: BannerValue): void;
    show(): void;
    dismiss(): void;
    setActions(actions: BannerAction[] | null | undefined): void;
    destroy(): void;
}

var GLYPHS: Record<BannerKind, string> = { info: MESSAGE_ICONS.info, success: MESSAGE_ICONS.success, warn: MESSAGE_ICONS.warn, error: MESSAGE_ICONS.error, neutral: MESSAGE_ICONS.neutral };

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
 *   actions      : array of { text, primary, className, onClick(button) } drawn as small buttons under the text, such as Apply [optional]
 *   onDismiss    : function() called when the user dismisses it [optional]
 * }
 * @returns { element, getValue, setValue, show, dismiss, setActions, destroy }. setActions replaces the buttons, and null removes them. getValue returns { kind, title, text, dismissed }, and setValue takes kind, title, and text.
 * With a key and a storage whose get(key) is true, the banner starts hidden.
 */
export function createBanner(options?: BannerOptions): BannerHandle {
    options = options || {};
    var kind: BannerKind = has(GLYPHS, options.kind as BannerKind) ? options.kind as BannerKind : 'info';
    var title: string = options.title || '';
    var text: string = options.text || '';
    var dismissed: boolean = false;
    var cleanups: Array<() => void> = [];

    var root = make('div', 'base-banner base-icon-text');
    var glyph = icon('');
    var body = make('div', 'base-banner-body');
    var titleEl = make('div', 'base-banner-title');
    var textEl = make('div', 'base-banner-text');
    var actionRow = make('div', 'base-button-row base-banner-actions');
    var actionOff: Array<() => void> = [];
    body.appendChild(titleEl);
    body.appendChild(textEl);
    body.appendChild(actionRow);
    root.appendChild(glyph);
    root.appendChild(body);
    var close = dismissButton('base-banner-close', options.dismissLabel || baseText('Base.Dismiss'));
    close.hidden = options.dismissible === false;
    root.appendChild(close);

    function reflect(): void {
        root.className = 'base-banner base-icon-text base-' + kind + (close.hidden ? '' : ' dismissible');
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

    function setActions(list: BannerAction[] | null | undefined): void {
        runAll(actionOff);
        actionOff = [];
        clear(actionRow);
        (list || []).forEach(function (action) {
            if (!action || !action.text) return;
            var button = make('button', 'raised base-button small ' + (action.primary ? 'primary' : 'secondary') + (action.className ? ' ' + action.className : ''), { type: 'button' }, action.text);
            if (action.onClick) {
                var run = action.onClick;
                actionOff.push(listen(button, 'click', function () { run(button); }));
            }
            actionRow.appendChild(button);
        });
        actionRow.hidden = !actionRow.children.length;
    }
    setActions(options.actions);

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
        setActions: setActions,
        destroy: function (): void { runAll(cleanups); runAll(actionOff); }
    };
}
