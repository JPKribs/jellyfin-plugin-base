import { make, icon, iconButton, listen, runAll, has } from './dom-util.js';

var GLYPHS = { info: 'info', success: 'check_circle', warn: 'warning', error: 'error', neutral: 'info' };

// createBanner
// A callout with a Dismiss button. It remembers a dismissal only when the caller gives a key and a storage object, so Base never touches browser storage on its own.
//
// Param: options | {
//   kind         : 'info', 'success', 'warn', 'error', or 'neutral' (default 'info')
//   title        : bold first line [optional]
//   text         : the message sentence [optional]
//   dismissible  : false hides the button (default true)
//   dismissLabel : title and aria-label of the button (default 'Dismiss')
//   key          : name that identifies this banner in the storage [optional]
//   storage      : { get: function(key), set: function(key, true) } that remembers a dismissal [optional]
//   onDismiss    : function() called when the user dismisses it [optional]
// }
// Returns { element, getValue, setValue, show, dismiss, destroy }. getValue returns { kind, title, text, dismissed }, and setValue takes kind, title, and text.
// With a key and a storage whose get(key) is true, the banner starts hidden.
export function createBanner(options) {
    options = options || {};
    var kind = has(GLYPHS, options.kind) ? options.kind : 'info';
    var title = options.title || '';
    var text = options.text || '';
    var dismissed = false;
    var cleanups = [];

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

    function reflect() {
        root.className = 'jpk-banner jpk-' + kind;
        glyph.textContent = GLYPHS[kind];
        titleEl.textContent = title;
        titleEl.hidden = !title;
        textEl.textContent = text;
        root.hidden = dismissed;
    }

    function dismiss() {
        dismissed = true;
        reflect();
        if (options.key && options.storage && options.storage.set) options.storage.set(options.key, true);
        if (options.onDismiss) options.onDismiss();
    }

    if (options.key && options.storage && options.storage.get && options.storage.get(options.key)) dismissed = true;
    cleanups.push(listen(close, 'click', dismiss));
    reflect();

    return {
        element: root,
        getValue: function () { return { kind: kind, title: title, text: text, dismissed: dismissed }; },
        setValue: function (next) {
            next = next || {};
            if (next.kind && has(GLYPHS, next.kind)) kind = next.kind;
            if (next.title !== undefined) title = next.title || '';
            if (next.text !== undefined) text = next.text || '';
            reflect();
        },
        show: function () { dismissed = false; reflect(); },
        dismiss: dismiss,
        destroy: function () { runAll(cleanups); }
    };
}
