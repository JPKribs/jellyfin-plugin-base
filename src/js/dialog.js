import { escapeHtml } from './escape.js';

var dialogCount = 0;

var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Whether el is visible, since FOCUSABLE also matches hidden controls that cannot take focus.
function isVisible(el) {
    if (el.type === 'hidden') return false;
    if (el.closest && el.closest('[hidden], .hidden')) return false;
    return !!(el.getClientRects && el.getClientRects().length);
}

// The focusable controls in root that the user can see, in document order.
function focusables(root) {
    if (!root) return [];
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), isVisible);
}

// Keeps Tab and Shift+Tab cycling inside container. Focus that has escaped it (or never got in) is brought back.
function trapFocus(container, e) {
    var focusable = focusables(container);
    if (!focusable.length) {
        e.preventDefault();
        focusContainer(container);
        return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;
    if (!container.contains(active) || active === container) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
    }
}

// Whether el is a text field, which raises the on-screen keyboard when it takes focus.
function isTextEntry(el) {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return el.isContentEditable === true;
    return !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/i.test(el.type || 'text');
}

// Whether the primary pointer is a touch screen.
function coarsePointer() {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

// Focuses the container itself, so Escape and the focus trap work without moving to any control.
function focusContainer(container) {
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
    container.focus();
}

// Focuses opts.autofocus, else the first visible body field, else a footer button that is not destructive, else the close button, else the container.
function focusFirst(container, opts) {
    opts = opts || {};
    var touch = coarsePointer();
    function safe(el) { return !(el.classList && el.classList.contains('jpk-button-destructive')); }
    function usable(el) { return safe(el) && !(touch && isTextEntry(el)); }
    if (opts.autofocus === false) { focusContainer(container); return; }
    if (opts.autofocus) {
        var wanted = typeof opts.autofocus === 'string' ? container.querySelector(opts.autofocus) : opts.autofocus;
        if (wanted && wanted.focus) {
            if (touch && isTextEntry(wanted)) focusContainer(container);
            else wanted.focus();
            return;
        }
    }
    var body = container.querySelector('.jpk-modal-body');
    var field = focusables(body).filter(safe)[0];
    if (field) {
        // On a touch screen the first field waits for a tap instead of falling through to a button.
        if (usable(field)) field.focus();
        else focusContainer(container);
        return;
    }
    var choice = focusables(container.querySelector('.jpk-modal-button-row')).filter(usable)[0]
        || focusables(container).filter(function (el) { return el.classList.contains('jpk-dialog-close'); })[0]
        || focusables(container).filter(usable)[0];
    if (choice) choice.focus();
    else focusContainer(container);
}

// Whether the event came from a component that is about to use Escape itself, which marks itself with data-jpk-escape.
function escapeClaimed(e) {
    return !!(e.target && e.target.closest && e.target.closest('[data-jpk-escape]'));
}

// Returns focus to the control that opened the dialog, else opts.returnFocus, else the first visible heading of the config page or the page itself.
function restoreFocus(previouslyFocused, opts) {
    function tryFocus(el) {
        if (!el || !el.focus || !el.isConnected || !isVisible(el)) return false;
        try { el.focus(); } catch (e) { return false; }
        return document.activeElement === el;
    }
    if (tryFocus(previouslyFocused)) return;
    var target = opts && opts.returnFocus;
    if (typeof target === 'function') { try { target = target(); } catch (e) { target = null; } }
    if (typeof target === 'string') target = document.querySelector(target);
    if (tryFocus(target)) return;
    var page = Array.prototype.filter.call(document.querySelectorAll('.pluginConfigurationPage'), isVisible)[0];
    var heading = page && Array.prototype.filter.call(page.querySelectorAll('h1, h2, h3'), isVisible)[0];
    var fallback = heading || page;
    if (fallback) {
        if (!fallback.hasAttribute('tabindex')) fallback.setAttribute('tabindex', '-1');
        tryFocus(fallback);
    }
}

// openDialog
// Opens a modal that closes on backdrop click, Escape, and the corner close button, each asking opts.beforeClose first. Focus is trapped in the panel and restored on close.
//
// Param: opts | {
//   title       : heading text [optional]
//   ariaLabel   : accessible name when there is no title (default the start of the body text, else 'Dialog') [optional]
//   body        : HTML string or a DOM node for the modal body [optional]
//   narrow      : constrain width for a compact dialog (default false)
//   wide        : a wide editor that fills the screen on a phone, with its buttons kept in view (default false)
//   className   : classes added to the panel, such as pluginConfigurationPage for the page's form look [optional]
//   dismissable : allow backdrop/Escape/close-button dismissal (default true)
//   closeButton : render the corner close button, which also needs dismissable (default true)
//   beforeClose : function() returning false, or a promise of false, to keep the dialog open when it is
//                 dismissed, such as to confirm discarding changes [optional]
//   buttons     : [{ text, className, value, action(close, dismiss, button) }] rendered in the footer row, where dismiss closes
//                 as Escape does, asking beforeClose first, and button is the clicked element [optional]
//   onClose     : function(value) called once when the dialog closes [optional]
//   autofocus   : the element or a selector within the dialog to focus on open, or false to focus the panel itself (default the first visible field, else a non-destructive footer button) [optional]
//   returnFocus : an element, a selector, or a function returning one, to focus on close when the control that opened the dialog is gone [optional]
// }
// Returns { element, content, close, dismiss, setTitle }, where content is the modal body.
export function openDialog(opts) {
    opts = opts || {};
    var previouslyFocused = document.activeElement;

    var overlay = document.createElement('div');
    // jpk-dialog-wide lets the phone layout match without :has(), which older engines lack.
    overlay.className = 'jpk-dialog' + (opts.wide ? ' jpk-dialog-wide' : '');

    var content = document.createElement('div');
    content.className = 'jpk-dialog-content' + (opts.narrow ? ' jpk-dialog-content-narrow' : '')
        + (opts.wide ? ' jpk-dialog-content-wide' : '') + (opts.className ? ' ' + opts.className : '');
    content.setAttribute('role', 'dialog');
    content.setAttribute('aria-modal', 'true');
    overlay.appendChild(content);

    var closed = false;
    var asking = false;
    // Closes the way Escape does, once beforeClose agrees.
    function dismiss() {
        if (closed || asking) return;
        var verdict = opts.beforeClose ? opts.beforeClose() : true;
        if (verdict && typeof verdict.then === 'function') {
            asking = true;
            verdict.then(function (ok) { asking = false; if (ok !== false) close(); }, function () { asking = false; });
        } else if (verdict !== false) {
            close();
        }
    }
    // Removes the dialog, returns focus, and calls onClose once with the value.
    function close(value) {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKeyDown, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        // A dialog still open underneath keeps focus, and otherwise focus returns to the page.
        var below = topDialog();
        if (below && !below.contains(previouslyFocused)) focusFirst(below.querySelector('.jpk-dialog-content') || below);
        else restoreFocus(previouslyFocused, opts);
        if (opts.onClose) opts.onClose(value);
    }

    var dismissable = opts.dismissable !== false;

    if (opts.closeButton !== false && dismissable) {
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'jpk-dialog-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', dismiss);
        content.appendChild(closeBtn);
    }

    var title = document.createElement('h2');
    title.className = 'jpk-modal-title';
    title.id = 'jpk-dialog-title-' + (++dialogCount);
    title.textContent = opts.title || '';
    // The label points at the title only while the title is in the panel.
    if (opts.title) {
        content.appendChild(title);
        content.setAttribute('aria-labelledby', title.id);
    }

    var bodyEl = document.createElement('div');
    bodyEl.className = 'jpk-modal-body';
    if (opts.body instanceof Node) {
        bodyEl.appendChild(opts.body);
    } else if (typeof opts.body === 'string') {
        bodyEl.innerHTML = opts.body;
    }
    content.appendChild(bodyEl);
    if (!opts.title) {
        var name = opts.ariaLabel || String(bodyEl.textContent || '').replace(/\s+/g, ' ').trim();
        content.setAttribute('aria-label', (name.slice(0, 80) || 'Dialog'));
    }

    if (opts.buttons && opts.buttons.length) {
        var row = document.createElement('div');
        row.className = 'jpk-modal-button-row';
        opts.buttons.forEach(function (spec) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'raised jpk-modal-button ' + (spec.className || 'jpk-secondary');
            btn.textContent = spec.text || '';
            btn.addEventListener('click', function () {
                if (spec.action) spec.action(close, dismiss, btn);
                else close(spec.value);
            });
            row.appendChild(btn);
        });
        content.appendChild(row);
    }

    // Escape dismisses and Tab stays inside the panel, for the dialog on top only.
    function onKeyDown(e) {
        // Only the dialog on top answers Escape.
        if (e.key === 'Escape' && dismissable && overlay === topDialog() && !escapeClaimed(e)) {
            e.preventDefault();
            e.stopPropagation();
            dismiss();
            return;
        }
        if (e.key === 'Tab' && overlay === topDialog()) {
            trapFocus(content, e);
        }
    }

    overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay && dismissable) dismiss();
    });
    document.addEventListener('keydown', onKeyDown, true);

    document.body.appendChild(overlay);
    focusFirst(content, opts);

    return {
        element: overlay,
        content: bodyEl,
        close: close,
        dismiss: dismiss,
        setTitle: function (text) {
            title.textContent = text || '';
            if (text) {
                if (!title.parentNode) content.insertBefore(title, bodyEl);
                content.setAttribute('aria-labelledby', title.id);
            } else {
                if (title.parentNode) title.parentNode.removeChild(title);
                content.removeAttribute('aria-labelledby');
            }
        }
    };
}

// Returns the rendered dialog on top, skipping in-page dialogs that stay in the markup while closed.
function topDialog() {
    var all = Array.prototype.filter.call(document.querySelectorAll('.jpk-dialog'), function (d) {
        return !d.classList.contains('hidden') && !d.hidden && d.getClientRects().length > 0;
    });
    return all.length ? all[all.length - 1] : null;
}

// bindDialog
// Gives a jpk-dialog already in the page markup the behavior openDialog builds, so it shows and hides by the hidden class, closes on backdrop click, Escape, and any .jpk-dialog-close button, and traps and restores focus. The panel gets dialog semantics when the markup does not set them.
//
// Param: overlay | the .jpk-dialog element, or its id within root
// Param: opts    | {
//   root        : element to resolve an id within (default document)
//   dismissable : allow backdrop/Escape/close-button dismissal (default true)
//   onOpen      : function() called after the dialog shows [optional]
//   onClose     : function(value) called once per close [optional]
//   autofocus, returnFocus : as openDialog [optional]
// }
// Returns { element, open, close(value), isOpen, destroy }.
export function bindDialog(overlay, opts) {
    opts = opts || {};
    if (typeof overlay === 'string') {
        overlay = (opts.root || document).querySelector('#' + overlay);
    }
    if (!overlay) throw new Error('bindDialog: dialog element not found');

    var content = overlay.querySelector('.jpk-dialog-content') || overlay;
    // A role on the overlay already names the dialog, and a second one on the panel would announce two nested dialogs.
    var described = overlay !== content && overlay.hasAttribute('role');
    if (!described) {
        if (!content.hasAttribute('role')) content.setAttribute('role', 'dialog');
        if (!content.hasAttribute('aria-modal')) content.setAttribute('aria-modal', 'true');
        if (!content.hasAttribute('aria-labelledby') && !content.hasAttribute('aria-label')) {
            var heading = content.querySelector('.jpk-modal-title, h1, h2, h3');
            if (heading) {
                if (!heading.id) heading.id = 'jpk-dialog-title-' + (++dialogCount);
                content.setAttribute('aria-labelledby', heading.id);
            }
        }
    }
    var dismissable = opts.dismissable !== false;
    var previouslyFocused = null;
    var open = false;

    // Only the dialog on top answers, so Escape on a confirm opened over this one closes just the confirm.
    function onKeyDown(e) {
        if (overlay !== topDialog()) return;
        if (e.key === 'Escape' && dismissable) {
            if (escapeClaimed(e)) return;
            e.preventDefault();
            e.stopPropagation();
            close();
        } else if (e.key === 'Tab') {
            trapFocus(content, e);
        }
    }

    function onMouseDown(e) {
        if (e.target === overlay && dismissable) close();
    }

    function onClick(e) {
        if (dismissable && e.target.closest && e.target.closest('.jpk-dialog-close')) close();
    }

    // Shows the dialog, remembers the focused control, and focuses into the panel.
    function show() {
        if (open) return;
        open = true;
        previouslyFocused = document.activeElement;
        overlay.classList.remove('hidden');
        document.addEventListener('keydown', onKeyDown, true);
        focusFirst(content, opts);
        if (opts.onOpen) opts.onOpen();
    }

    // Hides the dialog, returns focus, and calls onClose with the value.
    function close(value) {
        if (!open) return;
        open = false;
        overlay.classList.add('hidden');
        document.removeEventListener('keydown', onKeyDown, true);
        restoreFocus(previouslyFocused, opts);
        if (opts.onClose) opts.onClose(value);
    }

    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('click', onClick);

    return {
        element: overlay,
        open: show,
        close: close,
        isOpen: function () { return open; },
        destroy: function () {
            close();
            overlay.removeEventListener('mousedown', onMouseDown);
            overlay.removeEventListener('click', onClick);
        }
    };
}

// confirmDialog
// Opens a yes or no dialog that resolves to true when confirmed and false otherwise.
//
// Param: message | body text, or HTML when opts.html is true
// Param: opts    | { title, confirmText (default 'Confirm'), cancelText (default 'Cancel'), destructive, html } [optional]
export function confirmDialog(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
        var settled = false;
        function done(value) { if (!settled) { settled = true; resolve(value); } }

        openDialog({
            title: opts.title,
            ariaLabel: opts.html ? String(message).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : String(message),
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

// openEditorDialog
// Opens an editor dialog for one record with Remove, Cancel, and Done buttons, and asks before it discards edits. Given the createConfigPage handle, it counts toward the page unsaved guard and closes when the page hides.
//
// Param: opts | {
//   title, body, className, narrow : as openDialog (it is wide unless narrow is set)
//   page       : the createConfigPage handle [optional]
//   isNew      : true for a record not saved yet, which has no Remove button (default false)
//   serialize  : function() returning a stable string of the editor's state, for its change tracking
//   ready      : a promise to wait on before taking the clean snapshot, such as fields still loading [optional]
//   doneText, removeText, cancelText : button labels (default Done, Remove, Cancel)
//   onDone     : function(close) returning false (or a promise of false) to stay open, such as on invalid input
//   onRemove   : function(close) for Remove, which closes the dialog itself when done [optional]
//   onClose    : function(value) called once when the dialog closes [optional]
//   autofocus, returnFocus : as openDialog [optional]
// }
// Returns the openDialog handle plus isDirty() and markClean().
export function openEditorDialog(opts) {
    opts = opts || {};
    var serialize = opts.serialize || function () { return ''; };
    var snapshot = null;
    function isDirty() {
        try { return snapshot !== null && serialize() !== snapshot; } catch (e) { return false; }
    }
    var buttons = [];
    if (!opts.isNew && opts.onRemove) {
        buttons.push({ text: opts.removeText || 'Remove', className: 'jpk-button-destructive', action: function (close) { opts.onRemove(close); } });
    }
    buttons.push({ text: opts.cancelText || 'Cancel', className: 'jpk-secondary', action: function (close, dismiss) { dismiss(); } });
    // Done stays disabled while onDone is pending, and a rejection re-enables it since onDone reports its own error.
    var busy = false;
    buttons.push({
        text: opts.doneText || 'Done',
        className: 'jpk-button-submit',
        action: function (close, dismiss, btn) {
            if (busy) return;
            var verdict = opts.onDone ? opts.onDone(close) : true;
            if (verdict && typeof verdict.then === 'function') {
                busy = true;
                if (btn) btn.disabled = true;
                verdict.then(function (ok) {
                    busy = false;
                    if (btn) btn.disabled = false;
                    if (ok !== false) close('done');
                }).catch(function () {
                    busy = false;
                    if (btn) btn.disabled = false;
                });
            } else if (verdict !== false) {
                close('done');
            }
        }
    });
    var handle = openDialog({
        title: opts.title,
        body: opts.body,
        wide: !opts.narrow,
        narrow: !!opts.narrow,
        className: opts.className,
        buttons: buttons,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        beforeClose: function () {
            return !isDirty() || confirmDialog('Discard your changes?', { title: 'Unsaved Changes', confirmText: 'Discard', destructive: true });
        },
        onClose: function (value) {
            if (opts.page && opts.page.untrackEditor) opts.page.untrackEditor(handle);
            if (opts.onClose) opts.onClose(value);
        }
    });
    handle.isDirty = isDirty;
    handle.markClean = function () { snapshot = serialize(); };
    Promise.resolve(opts.ready).then(function () { snapshot = serialize(); }, function () { snapshot = serialize(); });
    if (opts.page && opts.page.trackEditor) opts.page.trackEditor(handle);
    return handle;
}

// promptDialog
// Opens a small form that resolves to a { name: value } map, or to null when cancelled.
//
// Param: fields | [{ name, label, type, value, placeholder, options }], where type is text, number, password, textarea, or select (default text) and a select reads options as [{ value, label }]
// Param: opts   | { title, submitText (default 'Done'), cancelText (default 'Cancel') } [optional]
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
                { text: opts.submitText || 'Done', className: 'jpk-button-submit', action: function (close) { close(collect()); } }
            ],
            onClose: function (value) { done(value || null); }
        });

        // A prefilled first field is selected so typing replaces it.
        var firstControl = fields.length ? controls[fields[0].name] : null;
        if (firstControl && document.activeElement === firstControl && firstControl.select && firstControl.tagName !== 'SELECT') {
            firstControl.select();
        }

        // Enter in a single line input submits the form.
        form.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                handle.close(collect());
            }
        });
    });
}
