import { openDialog } from './dialog.js';
import type { DialogButton, DialogOptions, DialogHandle } from './dialog.js';
import { confirmDialog } from './confirm-dialog.js';
import type { PageHandle } from './types.js';

/** What openEditorDialog takes. onDone returns false, or a promise of false, to keep the editor open. */
export interface EditorDialogOptions extends Pick<DialogOptions, 'title' | 'body' | 'className' | 'size' | 'autofocus' | 'returnFocus'> {
    page?: Pick<PageHandle, 'trackEditor' | 'untrackEditor'> | null;
    isNew?: boolean;
    serialize?(): string;
    ready?: unknown;
    doneText?: string;
    removeText?: string;
    cancelText?: string;
    onDone?(close: (value?: unknown) => void): boolean | void | PromiseLike<boolean | void>;
    onRemove?(close: (value?: unknown) => void): void;
    onClose?(value: unknown): void;
}

/** What openEditorDialog returns, the openDialog handle plus its change tracking. */
export interface EditorDialogHandle extends DialogHandle {
    isDirty(): boolean;
    markClean(): void;
}

/**
 * Opens an editor dialog for one record with Remove, Cancel, and Done buttons, and asks before it discards edits. Given the createConfigPage handle, it counts toward the page unsaved guard and closes when the page hides.
 *
 * @param opts {
 *   title, body, className, size : as openDialog (size is 'large' unless set)
 *   page       : the createConfigPage handle [optional]
 *   isNew      : true for a record not saved yet, which has no Remove button (default false)
 *   serialize  : function() returning a stable string of the editor's state, for its change tracking
 *   ready      : a promise to wait on before taking the clean snapshot, such as fields still loading [optional]
 *   doneText, removeText, cancelText : button labels (default Done, Remove, Cancel)
 *   onDone     : function(close) returning false (or a promise of false) to stay open, such as on invalid input
 *   onRemove   : function(close) for Remove, which closes the dialog itself when done [optional]
 *   onClose    : function(value) called once when the dialog closes [optional]
 *   autofocus, returnFocus : as openDialog [optional]
 * }
 * @returns the openDialog handle plus isDirty() and markClean().
 */
export function openEditorDialog(opts?: EditorDialogOptions): EditorDialogHandle {
    opts = opts || {};
    var serialize: () => string = opts.serialize || function (): string { return ''; };
    var snapshot: string | null = null;
    function isDirty(): boolean {
        try { return snapshot !== null && serialize() !== snapshot; } catch (e) { return false; }
    }
    var buttons: DialogButton[] = [];
    if (!opts.isNew && opts.onRemove) {
        buttons.push({ text: opts.removeText || 'Remove', className: 'base-button destructive', action: function (close): void { opts.onRemove!(close); } });
    }
    buttons.push({ text: opts.cancelText || 'Cancel', className: 'base-button secondary', action: function (close, dismiss): void { dismiss(); } });
    // Done stays disabled while onDone is pending, and a rejection re-enables it since onDone reports its own error.
    var busy: boolean = false;
    buttons.push({
        text: opts.doneText || 'Done',
        className: 'base-button primary',
        action: function (close, dismiss, btn): void {
            if (busy) return;
            var verdict: boolean | void | PromiseLike<boolean | void> = opts.onDone ? opts.onDone(close) : true;
            if (verdict && typeof (verdict as PromiseLike<boolean | void>).then === 'function') {
                busy = true;
                if (btn) btn.disabled = true;
                (verdict as Promise<boolean | void>).then(function (ok: boolean | void): void {
                    busy = false;
                    if (btn) btn.disabled = false;
                    if (ok !== false) close('done');
                }).catch(function (): void {
                    busy = false;
                    if (btn) btn.disabled = false;
                });
            } else if (verdict !== false) {
                close('done');
            }
        }
    });
    var handle: EditorDialogHandle = openDialog({
        title: opts.title,
        body: opts.body,
        size: opts.size || 'large',
        className: opts.className,
        buttons: buttons,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        beforeClose: function (): boolean | Promise<boolean> {
            return !isDirty() || confirmDialog('Discard your changes?', { title: 'Unsaved Changes', confirmText: 'Discard', destructive: true });
        },
        onClose: function (value: unknown): void {
            if (opts.page && opts.page.untrackEditor) opts.page.untrackEditor(handle);
            if (opts.onClose) opts.onClose(value);
        }
    }) as EditorDialogHandle;
    handle.isDirty = isDirty;
    handle.markClean = function (): void { snapshot = serialize(); };
    Promise.resolve(opts.ready).then(function (): void { snapshot = serialize(); }, function (): void { snapshot = serialize(); });
    if (opts.page && opts.page.trackEditor) opts.page.trackEditor(handle);
    return handle;
}
