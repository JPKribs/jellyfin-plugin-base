import { createModalShell, dialogButtonRow } from './lib/dialog.js';
import type { ModalShell } from './lib/dialog.js';
import { nextId } from './lib/dom.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** One footer button. icon is a Material icon name drawn before the text, action gets close, dismiss, and the clicked button, and without it a click closes with value. */
export interface DialogButton {
    text?: string;
    icon?: string;
    className?: string;
    value?: unknown;
    action?(close: (value?: unknown) => void, dismiss: () => void, button: HTMLButtonElement): void;
}

/** What openDialog takes. beforeClose returns false, or a promise of false, to keep the dialog open. */
export interface DialogOptions {
    title?: string;
    ariaLabel?: string;
    body?: string | Node;
    size?: 'small' | 'medium' | 'large';
    className?: string;
    dismissable?: boolean;
    closeButton?: boolean;
    beforeClose?(): boolean | PromiseLike<boolean | void>;
    buttons?: DialogButton[];
    onClose?(value: unknown): void;
    autofocus?: HTMLElement | string | false | null;
    returnFocus?: HTMLElement | string | (() => HTMLElement | string | null) | null;
    page?: { addCleanup(fn: () => void): unknown } | null;
}

/** What openDialog returns, where content is the modal body. */
export interface DialogHandle extends ComponentHandle {
    element: HTMLDivElement;
    content: HTMLDivElement;
    close(value?: unknown): void;
    dismiss(): void;
    setTitle(text: string): void;
}

/**
 * Opens a modal that closes on backdrop click, Escape, and the corner close button, each asking opts.beforeClose first. Focus is trapped in the panel and restored on close.
 *
 * @param opts {
 *   title       : heading text [optional]
 *   ariaLabel   : accessible name when there is no title (default the start of the body text, else 'Dialog') [optional]
 *   body        : HTML string or a DOM node for the modal body [optional]
 *   size        : 'small' (40% of the window width), 'medium' (60%), or 'large' (80%, filling the screen on a phone with its buttons kept in view) (default 'medium')
 *   className   : classes added to the panel, such as pluginConfigurationPage for the page's form look [optional]
 *   dismissable : allow backdrop/Escape/close-button dismissal (default true)
 *   closeButton : render the corner close button, which also needs dismissable (default true)
 *   beforeClose : function() returning false, or a promise of false, to keep the dialog open when it is
 *                 dismissed, such as to confirm discarding changes [optional]
 *   buttons     : [{ text, icon, className, value, action(close, dismiss, button) }] rendered in the footer row, where dismiss closes
 *                 as Escape does, asking beforeClose first, icon is a Material icon name before the text, and button is the clicked element [optional]
 *   onClose     : function(value) called once when the dialog closes [optional]
 *   autofocus   : the element or a selector within the dialog to focus on open, or false to focus the panel itself (default the first visible field, else a non-destructive footer button) [optional]
 *   returnFocus : an element, a selector, or a function returning one, to focus on close when the control that opened the dialog is gone [optional]
 *   page        : the page handle from createConfigPage, so the dialog closes when the page hides [optional]
 * }
 * @returns { element, content, close, dismiss, setTitle }, where content is the modal body.
 */
export function openDialog(opts?: DialogOptions): DialogHandle {
    opts = opts || {};
    var shell: ModalShell = createModalShell(opts);
    var content: HTMLDivElement = shell.content;

    var title = document.createElement('h2');
    title.className = 'base-modal-title';
    title.id = nextId('dialog-title');
    title.textContent = opts.title || '';
    // The label points at the title only while the title is in the panel.
    if (opts.title) {
        content.appendChild(title);
        content.setAttribute('aria-labelledby', title.id);
    }

    var bodyEl = document.createElement('div');
    bodyEl.className = 'base-modal-body';
    if (opts.body instanceof Node) {
        bodyEl.appendChild(opts.body);
    } else if (typeof opts.body === 'string') {
        bodyEl.innerHTML = opts.body;
    }
    content.appendChild(bodyEl);
    if (!opts.title) {
        var name: string = opts.ariaLabel || String(bodyEl.textContent || '').replace(/\s+/g, ' ').trim();
        content.setAttribute('aria-label', (name.slice(0, 80) || baseText('Base.Dialog')));
    }

    var row: HTMLDivElement | null = dialogButtonRow(opts.buttons, shell.close, shell.dismiss);
    if (row) content.appendChild(row);

    shell.show();
    // Leaving the page closes the dialog, without asking beforeClose, since the page is gone.
    if (opts.page && typeof opts.page.addCleanup === 'function') opts.page.addCleanup(function () { shell.close(); });

    return {
        element: shell.overlay,
        content: bodyEl,
        close: shell.close,
        dismiss: shell.dismiss,
        setTitle: function (text: string): void {
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
