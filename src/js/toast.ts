import { make, icon, listen, runAll, has } from './lib/dom.js';
import { MESSAGE_ICONS, dismissButton } from './lib/message.js';
import type { ComponentHandle } from './types.js';

/** The tone of a toast. An error toast joins the assertive live region, and the rest the polite one. */
export type ToastKind = 'info' | 'success' | 'warn' | 'error';

/** What show takes for one toast. A plain string is the message. */
export interface ToastSpec {
    message?: string;
    kind?: ToastKind | string;
    title?: string;
    timeout?: number;
}

/** One shown toast, as show returns it. */
export interface Toast {
    element: HTMLDivElement;
    dismiss(): void;
}

/** What createToaster takes. A timeout of 0 keeps a toast until it is dismissed. */
export interface ToasterOptions {
    parent?: HTMLElement | null;
    position?: 'bottom-end' | 'bottom-start' | 'top-end' | 'top-start' | string;
    timeout?: number;
    max?: number;
    label?: string;
    dismissLabel?: string;
    onDismiss?(spec: ToastSpec): void;
}

/** What createToaster returns. info, success, warn, and error are shortcuts for show. */
export interface ToasterHandle extends ComponentHandle {
    show(spec: ToastSpec | string): Toast;
    info(message: string, timeout?: number): Toast;
    success(message: string, timeout?: number): Toast;
    warn(message: string, timeout?: number): Toast;
    error(message: string, timeout?: number): Toast;
    clear(): void;
    destroy(): void;
}

var KINDS: Record<ToastKind, string> = { info: MESSAGE_ICONS.info, success: MESSAGE_ICONS.success, warn: MESSAGE_ICONS.warn, error: MESSAGE_ICONS.error };

/**
 * A stack of transient messages in persistent live regions. A toast closes itself after the timeout, closes from its Dismiss button, and pauses its timer while the pointer or focus is on it. Info, success, and warn toasts join a polite region, and an error toast joins an assertive one, so a screen reader announces each as it arrives. An error toast stays until dismissed unless a timeout is set.
 *
 * @param options {
 *   parent       : element that holds the stack (default the document body, or the open dialog while one is open, so a modal does not hide the toast from a screen reader)
 *   position     : 'bottom-end', 'bottom-start', 'top-end', or 'top-start' (default 'bottom-end')
 *   timeout      : milliseconds before a toast closes, and 0 keeps it until dismissed (default 5000, and 0 for an error toast unless set here or on the toast)
 *   max          : most toasts shown at once, where the oldest closes first (default 5)
 *   label        : aria-label of the stack (default 'Notifications')
 *   dismissLabel : title and aria-label of the dismiss button (default 'Dismiss')
 *   onDismiss    : function(toastOptions) called when a toast closes [optional]
 * }
 * @returns { element, show, info, success, warn, error, clear, destroy }.
 * show({ message, kind, title, timeout }) returns { element, dismiss }. The kind is info, success, warn, or error, and info, success, warn, and error take (message, timeout) as shortcuts.
 */
export function createToaster(options?: ToasterOptions): ToasterHandle {
    options = options || {};
    var live: Toast[] = [];
    var max: number = options.max || 5;

    var root = make('div', 'base-toaster base-toaster-' + (options.position || 'bottom-end'), { role: 'region', 'aria-label': options.label || 'Notifications' });
    // The two live regions are made once and stay, because a region that arrives together with its message is often not announced.
    var alerts = make('div', 'base-toaster-live', { role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'false' });
    var statuses = make('div', 'base-toaster-live', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'false' });
    root.appendChild(alerts);
    root.appendChild(statuses);
    (options.parent || document.body).appendChild(root);

    // Moves the stack into the dialog on top while one is open, and back to the body when that dialog is gone.
    function host(): void {
        if (options!.parent) return;
        var dialogs: HTMLElement[] = Array.prototype.filter.call(document.querySelectorAll<HTMLElement>('.base-dialog'), function (d: HTMLElement): boolean {
            return !d.classList.contains('hidden') && !d.hidden && d.getClientRects().length > 0;
        });
        var wanted: HTMLElement = dialogs.length ? dialogs[dialogs.length - 1] : document.body;
        if (root.parentNode !== wanted) wanted.appendChild(root);
    }

    function show(spec: ToastSpec | string): Toast {
        spec = typeof spec === 'string' ? { message: spec } : (spec || {});
        var kind: ToastKind = has(KINDS, spec.kind as ToastKind) ? spec.kind as ToastKind : 'info';
        var wait: number = spec.timeout !== undefined ? spec.timeout : (options!.timeout !== undefined ? options!.timeout : (kind === 'error' ? 0 : 5000));
        var el = make('div', 'base-toast base-float base-icon-text ' + kind);
        el.appendChild(icon(KINDS[kind]));
        var body = make('div', 'base-toast-body');
        if (spec.title) body.appendChild(make('div', 'base-toast-title', null, spec.title));
        body.appendChild(make('div', 'base-toast-message', null, spec.message || ''));
        el.appendChild(body);
        var close = dismissButton('base-toast-close', options!.dismissLabel || 'Dismiss');
        el.appendChild(close);
        var timer: ReturnType<typeof setTimeout> | null = null;
        var off: Array<() => void> = [];
        var done: boolean = false;

        function start(): void {
            clearTimeout(timer as ReturnType<typeof setTimeout>);
            if (wait > 0) timer = setTimeout(dismiss, wait);
        }

        function dismiss(): void {
            if (done) return;
            done = true;
            clearTimeout(timer as ReturnType<typeof setTimeout>);
            runAll(off);
            if (el.parentNode) el.parentNode.removeChild(el);
            live = live.filter(function (t: Toast): boolean { return t.element !== el; });
            if (options!.onDismiss) options!.onDismiss(spec as ToastSpec);
        }

        off.push(listen(close, 'click', dismiss));
        off.push(listen(el, 'mouseenter', function () { clearTimeout(timer as ReturnType<typeof setTimeout>); }));
        off.push(listen(el, 'mouseleave', start));
        off.push(listen(el, 'focusin', function () { clearTimeout(timer as ReturnType<typeof setTimeout>); }));
        off.push(listen(el, 'focusout', start));

        var toast: Toast = { element: el, dismiss: dismiss };
        live.push(toast);
        host();
        (kind === 'error' ? alerts : statuses).appendChild(el);
        while (live.length > max) live[0].dismiss();
        start();
        return toast;
    }

    function shortcut(kind: ToastKind): (message: string, timeout?: number) => Toast {
        return function (message: string, timeout?: number): Toast { return show({ message: message, kind: kind, timeout: timeout }); };
    }

    return {
        element: root,
        show: show,
        info: shortcut('info'),
        success: shortcut('success'),
        warn: shortcut('warn'),
        error: shortcut('error'),
        clear: function (): void { live.slice().forEach(function (t: Toast): void { t.dismiss(); }); },
        destroy: function (): void {
            live.slice().forEach(function (t: Toast): void { t.dismiss(); });
            if (root.parentNode) root.parentNode.removeChild(root);
        }
    };
}
