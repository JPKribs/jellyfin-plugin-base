// Dialog helpers.
//
// The kit ships the jpk-dialog / jpk-modal-* CSS but no behavior, so every plugin re-implemented open/close,
// backdrop-click, Escape, and focus trapping. These build that behavior on the shared markup:
//   * openDialog   - a general modal with a title, body, and footer buttons; returns a handle
//   * confirmDialog - a yes/no prompt; resolves to a boolean
//   * promptDialog  - a small form of labelled fields; resolves to the values, or null when cancelled

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// openDialog
// Opens a modal and returns { element, content, close }. The overlay closes on backdrop click (unless
// opts.dismissable === false), on Escape, and on the corner close button. Focus is trapped within the panel
// and restored to the previously focused element on close.
//
// Param: opts | {
//   title       : heading text [optional]
//   body        : HTML string or a DOM node for the modal body [optional]
//   narrow      : constrain width for a compact dialog (default false)
//   dismissable : allow backdrop/Escape/close-button dismissal (default true)
//   closeButton : render the corner close button (default true)
//   buttons     : [{ text, className, value, action(closeFn) }] rendered in the footer row [optional]
//   onClose     : function(value) called once when the dialog closes [optional]
// }
export function openDialog(opts) {
    opts = opts || {};
    var previouslyFocused = document.activeElement;

    var overlay = document.createElement('div');
    overlay.className = 'jpk-dialog';

    var content = document.createElement('div');
    content.className = 'jpk-dialog-content' + (opts.narrow ? ' jpk-dialog-content-narrow' : '');
    overlay.appendChild(content);

    var closed = false;
    function close(value) {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKeyDown, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (previouslyFocused && previouslyFocused.focus) {
            try { previouslyFocused.focus(); } catch (e) { /* element gone */ }
        }
        if (opts.onClose) opts.onClose(value);
    }

    var dismissable = opts.dismissable !== false;

    if (opts.closeButton !== false && dismissable) {
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'jpk-dialog-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', function () { close(); });
        content.appendChild(closeBtn);
    }

    if (opts.title) {
        var title = document.createElement('h2');
        title.className = 'jpk-modal-title';
        title.textContent = opts.title;
        content.appendChild(title);
    }

    var bodyEl = document.createElement('div');
    bodyEl.className = 'jpk-modal-body';
    if (opts.body instanceof Node) {
        bodyEl.appendChild(opts.body);
    } else if (typeof opts.body === 'string') {
        bodyEl.innerHTML = opts.body;
    }
    content.appendChild(bodyEl);

    if (opts.buttons && opts.buttons.length) {
        var row = document.createElement('div');
        row.className = 'jpk-modal-button-row';
        opts.buttons.forEach(function (spec) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'raised jpk-modal-button ' + (spec.className || 'jpk-secondary');
            btn.textContent = spec.text || '';
            btn.addEventListener('click', function () {
                if (spec.action) spec.action(close);
                else close(spec.value);
            });
            row.appendChild(btn);
        });
        content.appendChild(row);
    }

    function onKeyDown(e) {
        if (e.key === 'Escape' && dismissable) {
            e.preventDefault();
            close();
            return;
        }
        if (e.key === 'Tab') {
            trapFocus(e);
        }
    }

    function trapFocus(e) {
        var focusable = content.querySelectorAll(FOCUSABLE);
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay && dismissable) close();
    });
    document.addEventListener('keydown', onKeyDown, true);

    document.body.appendChild(overlay);

    // Focus the first control (or the panel) so Escape and the focus trap work immediately.
    var toFocus = content.querySelector(FOCUSABLE);
    if (toFocus) {
        toFocus.focus();
    } else {
        content.setAttribute('tabindex', '-1');
        content.focus();
    }

    return { element: overlay, content: bodyEl, close: close };
}

// confirmDialog
// Opens a yes/no dialog and resolves to true when confirmed, false otherwise.
//
// Param: message | body text (or HTML when opts.html is true)
// Param: opts    | { title, confirmText, cancelText, destructive, html }
export function confirmDialog(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
        var settled = false;
        function done(value) { if (!settled) { settled = true; resolve(value); } }

        openDialog({
            title: opts.title || 'Confirm',
            narrow: true,
            body: opts.html ? message : '<p>' + escapeHtml(message) + '</p>',
            buttons: [
                { text: opts.cancelText || 'Cancel', className: 'jpk-secondary', action: function (close) { close(false); } },
                {
                    text: opts.confirmText || 'Confirm',
                    className: opts.destructive ? 'jpk-button-destructive' : 'jpk-button-submit',
                    action: function (close) { close(true); }
                }
            ],
            onClose: function (value) { done(value === true); }
        });
    });
}

// promptDialog
// Opens a small form and resolves to a { name: value } map, or null when cancelled.
//
// Param: fields | [{ name, label, type, value, placeholder, options }] where type is text/number/password/
//                 textarea/select (default text); select uses options: [{ value, label }]
// Param: opts   | { title, submitText, cancelText }
export function promptDialog(fields, opts) {
    opts = opts || {};
    fields = fields || [];
    return new Promise(function (resolve) {
        var settled = false;
        function done(value) { if (!settled) { settled = true; resolve(value); } }

        var form = document.createElement('div');
        var controls = {};
        fields.forEach(function (f) {
            var wrap = document.createElement('div');
            wrap.className = 'jpk-modal-field';
            if (f.label) {
                var label = document.createElement('div');
                label.className = 'jpk-modal-field-label';
                label.textContent = f.label;
                wrap.appendChild(label);
            }
            var control;
            if (f.type === 'textarea') {
                control = document.createElement('textarea');
            } else if (f.type === 'select') {
                control = document.createElement('select');
                (f.options || []).forEach(function (o) {
                    var opt = document.createElement('option');
                    opt.value = o.value;
                    opt.textContent = o.label != null ? o.label : o.value;
                    control.appendChild(opt);
                });
            } else {
                control = document.createElement('input');
                control.type = f.type || 'text';
            }
            control.className = 'jpk-edit-input';
            if (f.placeholder) control.placeholder = f.placeholder;
            if (f.value != null) control.value = f.value;
            controls[f.name] = control;
            wrap.appendChild(control);
            form.appendChild(wrap);
        });

        function collect() {
            var out = {};
            Object.keys(controls).forEach(function (k) { out[k] = controls[k].value; });
            return out;
        }

        var handle = openDialog({
            title: opts.title || '',
            narrow: true,
            body: form,
            buttons: [
                { text: opts.cancelText || 'Cancel', className: 'jpk-secondary', action: function (close) { close(null); } },
                { text: opts.submitText || 'OK', className: 'jpk-button-submit', action: function (close) { close(collect()); } }
            ],
            onClose: function (value) { done(value || null); }
        });

        // Submit on Enter from any single-line input.
        form.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                handle.close(collect());
            }
        });
    });
}
