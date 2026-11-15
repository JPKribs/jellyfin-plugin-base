import { bindModalBehavior } from './lib/dialog.js';
import { nextId } from './lib/dom.js';
import type { DialogOptions } from './dialog.js';
import type { ComponentHandle } from './types.js';

/** What bindDialog takes. root is where an overlay id is looked up, and autofocus, returnFocus, and beforeClose work as in openDialog. */
export interface BindDialogOptions extends Pick<DialogOptions, 'autofocus' | 'returnFocus' | 'beforeClose'> {
    root?: ParentNode | null;
    dismissable?: boolean;
    onOpen?(): void;
    onClose?(value: unknown): void;
}

/** What bindDialog returns for a dialog already in the page markup. */
export interface BoundDialogHandle extends ComponentHandle {
    open(): void;
    close(value?: unknown): void;
    isOpen(): boolean;
    destroy(): void;
}

/**
 * Gives a base-dialog already in the page markup the behavior openDialog builds, so it shows and hides by the hidden class, closes on backdrop click, Escape, and any .base-dialog-close button, each asking opts.beforeClose first, and traps and restores focus. The panel gets dialog semantics when the markup does not set them.
 *
 * @param overlay the .base-dialog element, or its id within root
 * @param opts {
 *   root        : element to resolve an id within (default document)
 *   dismissable : allow backdrop/Escape/close-button dismissal (default true)
 *   beforeClose : function() returning false, or a promise of false, to keep the dialog open when it is dismissed [optional]
 *   onOpen      : function() called after the dialog shows [optional]
 *   onClose     : function(value) called once per close [optional]
 *   autofocus, returnFocus : as openDialog [optional]
 * }
 * @returns { element, open, close(value), isOpen, destroy }.
 */
export function bindDialog(overlay: HTMLElement | string | null, opts?: BindDialogOptions): BoundDialogHandle {
    opts = opts || {};
    if (typeof overlay === 'string') {
        overlay = (opts.root || document).querySelector<HTMLElement>('#' + overlay);
    }
    if (!overlay) throw new Error('bindDialog: dialog element not found');

    var content: HTMLElement = overlay.querySelector<HTMLElement>('.base-dialog-content') || overlay;
    // A role on the overlay already names the dialog, and a second one on the panel would announce two nested dialogs.
    var described: boolean = overlay !== content && overlay.hasAttribute('role');
    if (!described) {
        if (!content.hasAttribute('role')) content.setAttribute('role', 'dialog');
        if (!content.hasAttribute('aria-modal')) content.setAttribute('aria-modal', 'true');
        if (!content.hasAttribute('aria-labelledby') && !content.hasAttribute('aria-label')) {
            var heading: HTMLElement | null = content.querySelector<HTMLElement>('.base-modal-title, h1, h2, h3');
            if (heading) {
                if (!heading.id) heading.id = nextId('dialog-title');
                content.setAttribute('aria-labelledby', heading.id);
            }
        }
    }
    var open: boolean = false;
    var modal = bindModalBehavior(overlay, content, {
        dismissable: opts.dismissable,
        beforeClose: opts.beforeClose,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        onDismiss: function (): void { close(); }
    });

    // Shows the dialog and focuses into the panel.
    function show(): void {
        if (open) return;
        open = true;
        (overlay as HTMLElement).classList.remove('hidden');
        modal.activate();
        if (opts!.onOpen) opts!.onOpen();
    }

    // Hides the dialog, hands focus back, and calls onClose with the value.
    function close(value?: unknown): void {
        if (!open) return;
        open = false;
        (overlay as HTMLElement).classList.add('hidden');
        modal.release();
        if (opts!.onClose) opts!.onClose(value);
    }

    return {
        element: overlay,
        open: show,
        close: close,
        isOpen: function (): boolean { return open; },
        destroy: function (): void {
            close();
            modal.destroy();
        }
    };
}
