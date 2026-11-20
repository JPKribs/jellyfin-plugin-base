import { escapeHtml } from './browser-helpers.js';
import { openDialog } from './dialog.js';
import type { DialogHandle } from './dialog.js';
import { setFieldState } from './field-message.js';
import { make, nextId, fill } from './lib/dom.js';
import { baseText } from './lib/base-text.js';

/** What confirmDialog takes. html treats the message as HTML instead of text, and typeToConfirm asks for that exact text before the confirm button turns on. */
export interface ConfirmDialogOptions {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    html?: boolean;
    typeToConfirm?: string;
    typeLabel?: string;
    mismatchText?: string;
}

/**
 * Whether typed text matches the text a typed confirm asks for, exactly, case and spaces included.
 * Internal to the web components.
 *
 * @param typed what the reader typed
 * @param wanted the text to match
 */
export function typedMatches(typed: unknown, wanted: unknown): boolean {
    return typeof wanted === 'string' && wanted !== '' && typed === wanted;
}

/**
 * Opens a yes or no dialog that resolves to true when confirmed and false otherwise. With typeToConfirm it is a typed confirm,
 * whose confirm button stays off until the field holds that exact text, and Enter confirms only then.
 *
 * @param message body text, or HTML when opts.html is true
 * @param opts {
 *   title         : the dialog title, which names the action [optional]
 *   confirmText   : the confirm button label (default 'Confirm')
 *   cancelText    : the cancel button label (default 'Cancel')
 *   destructive   : true makes the confirm button destructive (default false)
 *   html          : true treats the message as HTML (default false)
 *   typeToConfirm : text the reader must type exactly before confirming, such as the name of what is deleted [optional]
 *   typeLabel     : the field's label, where {value} is the text to type (default 'Type {value} to confirm.')
 *   mismatchText  : the error under the field when Enter is pressed before it matches (default 'The text does not match.')
 * } [optional]
 */
export function confirmDialog(message: string, opts?: ConfirmDialogOptions): Promise<boolean> {
    opts = opts || {};
    var wanted: string = typeof opts.typeToConfirm === 'string' ? opts.typeToConfirm : '';
    return new Promise<boolean>(function (resolve): void {
        var settled: boolean = false;
        function done(value: boolean): void { if (!settled) { settled = true; resolve(value); } }

        var html: string = opts!.html ? message : '<p>' + escapeHtml(message) + '</p>';
        var body: string | HTMLElement = html;
        var input: HTMLInputElement | null = null;
        if (wanted) {
            body = make('div');
            body.innerHTML = html;
            var field = make('div', 'base-modal-field');
            input = make('input', 'base-edit-input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
            input.id = nextId('typed-confirm');
            field.appendChild(make('label', 'base-modal-field-label', { for: input.id }, fill(opts!.typeLabel || baseText('Base.TypeToConfirm'), wanted)));
            field.appendChild(input);
            body.appendChild(field);
        }

        var handle: DialogHandle = openDialog({
            title: opts!.title,
            ariaLabel: opts!.html ? String(message).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : String(message),
            size: 'small',
            body: body,
            buttons: [
                { text: opts!.cancelText || baseText('ButtonCancel'), className: 'base-button secondary', action: function (close): void { close(false); } },
                {
                    text: opts!.confirmText || baseText('Base.Confirm'),
                    className: opts!.destructive ? 'base-button destructive' : 'base-button primary',
                    action: function (close): void { if (!input || typedMatches(input.value, wanted)) close(true); }
                }
            ],
            onClose: function (value: unknown): void { done(value === true); }
        });

        if (!input) return;
        var typed: HTMLInputElement = input;
        var buttons: NodeListOf<HTMLButtonElement> = handle.element.querySelectorAll<HTMLButtonElement>('.base-modal-button');
        var confirmButton: HTMLButtonElement | null = buttons.length ? buttons[buttons.length - 1] : null;
        // The confirm button follows the match, and a mismatch error clears once the text matches or is emptied.
        function reflect(): void {
            var ok: boolean = typedMatches(typed.value, wanted);
            if (confirmButton) confirmButton.disabled = !ok;
            if (ok || !typed.value) setFieldState(typed, '');
        }
        typed.addEventListener('input', reflect);
        typed.addEventListener('keydown', function (e: KeyboardEvent): void {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (typedMatches(typed.value, wanted)) handle.close(true);
            else setFieldState(typed, 'error', opts!.mismatchText || baseText('Base.TextMismatch'));
        });
        reflect();
    });
}
