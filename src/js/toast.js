import { make, icon, iconButton, listen, runAll, has } from './dom-util.js';

var KINDS = { info: 'info', success: 'check_circle', warn: 'warning', error: 'error' };

// createToaster
// A stack of transient messages in persistent live regions. A toast closes itself after the timeout, closes from its Dismiss button, and pauses its timer while the pointer or focus is on it. Info, success, and warn toasts join a polite region, and an error toast joins an assertive one, so a screen reader announces each as it arrives. An error toast stays until dismissed unless a timeout is set.
//
// Param: options | {
//   parent       : element that holds the stack (default the document body, or the open dialog while one is open, so a modal does not hide the toast from a screen reader)
//   position     : 'bottom-end', 'bottom-start', 'top-end', or 'top-start' (default 'bottom-end')
//   timeout      : milliseconds before a toast closes, and 0 keeps it until dismissed (default 5000, and 0 for an error toast unless set here or on the toast)
//   max          : most toasts shown at once, where the oldest closes first (default 5)
//   label        : aria-label of the stack (default 'Notifications')
//   dismissLabel : title and aria-label of the dismiss button (default 'Dismiss')
//   onDismiss    : function(toastOptions) called when a toast closes [optional]
// }
// Returns { element, show, info, success, warn, error, clear, destroy }.
// show({ message, kind, title, timeout }) returns { element, dismiss }. The kind is info, success, warn, or error, and info, success, warn, and error take (message, timeout) as shortcuts.
export function createToaster(options) {
    options = options || {};
    var live = [];
    var max = options.max || 5;

    var root = make('div', 'jpk-toaster jpk-toaster-' + (options.position || 'bottom-end'), { role: 'region', 'aria-label': options.label || 'Notifications' });
    // The two live regions are made once and stay, because a region that arrives together with its message is often not announced.
    var alerts = make('div', 'jpk-toaster-live', { role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'false' });
    var statuses = make('div', 'jpk-toaster-live', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'false' });
    root.appendChild(alerts);
    root.appendChild(statuses);
    (options.parent || document.body).appendChild(root);

    // Moves the stack into the dialog on top while one is open, and back to the body when that dialog is gone.
    function host() {
        if (options.parent) return;
        var dialogs = Array.prototype.filter.call(document.querySelectorAll('.jpk-dialog'), function (d) {
            return !d.classList.contains('hidden') && !d.hidden && d.getClientRects().length > 0;
        });
        var wanted = dialogs.length ? dialogs[dialogs.length - 1] : document.body;
        if (root.parentNode !== wanted) wanted.appendChild(root);
    }

    function show(spec) {
        spec = typeof spec === 'string' ? { message: spec } : (spec || {});
        var kind = has(KINDS, spec.kind) ? spec.kind : 'info';
        var wait = spec.timeout !== undefined ? spec.timeout : (options.timeout !== undefined ? options.timeout : (kind === 'error' ? 0 : 5000));
        var el = make('div', 'jpk-toast ' + kind);
        el.appendChild(icon(KINDS[kind]));
        var body = make('div', 'jpk-toast-body');
        if (spec.title) body.appendChild(make('div', 'jpk-toast-title', null, spec.title));
        body.appendChild(make('div', 'jpk-toast-message', null, spec.message || ''));
        el.appendChild(body);
        var close = iconButton('jpk-row-btn jpk-toast-close', 'close', options.dismissLabel || 'Dismiss');
        el.appendChild(close);
        var timer = null;
        var off = [];
        var done = false;

        function start() {
            clearTimeout(timer);
            if (wait > 0) timer = setTimeout(dismiss, wait);
        }

        function dismiss() {
            if (done) return;
            done = true;
            clearTimeout(timer);
            runAll(off);
            if (el.parentNode) el.parentNode.removeChild(el);
            live = live.filter(function (t) { return t.element !== el; });
            if (options.onDismiss) options.onDismiss(spec);
        }

        off.push(listen(close, 'click', dismiss));
        off.push(listen(el, 'mouseenter', function () { clearTimeout(timer); }));
        off.push(listen(el, 'mouseleave', start));
        off.push(listen(el, 'focusin', function () { clearTimeout(timer); }));
        off.push(listen(el, 'focusout', start));

        var toast = { element: el, dismiss: dismiss };
        live.push(toast);
        host();
        (kind === 'error' ? alerts : statuses).appendChild(el);
        while (live.length > max) live[0].dismiss();
        start();
        return toast;
    }

    function shortcut(kind) {
        return function (message, timeout) { return show({ message: message, kind: kind, timeout: timeout }); };
    }

    return {
        element: root,
        show: show,
        info: shortcut('info'),
        success: shortcut('success'),
        warn: shortcut('warn'),
        error: shortcut('error'),
        clear: function () { live.slice().forEach(function (t) { t.dismiss(); }); },
        destroy: function () {
            live.slice().forEach(function (t) { t.dismiss(); });
            if (root.parentNode) root.parentNode.removeChild(root);
        }
    };
}
