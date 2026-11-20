import { adornField } from './field-adornments.js';
import { make, iconButton, nextId, listen, runAll, applyFieldSize, toText } from './lib/dom.js';
import { copyToClipboard } from './browser-helpers.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** What createCopyField takes. secret masks the value, allowExpose adds an eye inside the box that shows it, inline sits it in a row with no space below, and wrap shows the whole value over as many lines as it needs. */
export interface CopyFieldOptions {
    value?: unknown;
    inline?: boolean;
    wrap?: boolean;
    secret?: boolean;
    allowExpose?: boolean;
    mono?: boolean;
    label?: string;
    copyLabel?: string;
    copiedText?: string;
    failedText?: string;
    revealLabel?: string;
    hideLabel?: string;
    feedbackMs?: number;
    size?: 'small' | 'medium' | 'large';
    onCopy?(value: string, ok: boolean): void;
}

/** What createCopyField returns. copy resolves to whether the copy worked. With wrap, input is hidden and holds the value the shown text mirrors. */
export interface CopyFieldHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string;
    setValue(value: unknown): void;
    copy(): Promise<boolean>;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

/**
 * A read-only value with a copy button beside it that shows its result. A secret value is masked, and with allowExpose
 * an eye inside the box shows and hides it.
 *
 * @param options {
 *   value        : the text to show and copy [optional]
 *   secret       : true masks the value (default false)
 *   allowExpose  : true adds an eye inside a secret's box that shows and hides it (default false)
 *   inline       : true sits the field in a row or a table cell, with none of a form field's space below it (default false)
 *   wrap         : true shows the whole value, broken over as many lines as it needs, with the buttons level with its first line. Ignored for a secret (default false)
 *   mono         : true shows the value in the mono font (default true)
 *   label        : aria-label of the value (default 'Value')
 *   copyLabel    : title and aria-label of the copy button (default 'Copy')
 *   copiedText   : feedback after a copy (default 'Copied')
 *   failedText   : feedback when the copy failed (default 'Copy failed.')
 *   revealLabel  : title of the eye while masked (default 'Show')
 *   hideLabel    : title of the eye while shown (default 'Hide')
 *   feedbackMs   : how long the feedback stays (default 1500)
 *   size         : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   onCopy       : function(value, ok) called after each copy [optional]
 * }
 * @returns { element, input, getValue, setValue, copy, setSize, destroy }. copy() returns a promise of whether the copy worked.
 */
export function createCopyField(options?: CopyFieldOptions): CopyFieldHandle {
    options = options || {};
    var cleanups: Array<() => void> = [];
    var timer: ReturnType<typeof setTimeout> | null = null;
    var copyLabel = options.copyLabel || baseText('Copy');

    var wrap = !!options.wrap && !options.secret;
    var root = make('div', 'base-copy-field' + (options.inline ? ' inline' : '') + (wrap ? ' wrap' : ''));
    applyFieldSize(root, options.size);
    var mono = options.mono === false ? '' : 'base-mono';
    var input = make('input', mono, { type: options.secret ? 'password' : 'text', 'aria-label': options.label || baseText('LabelValue'), autocomplete: 'off' });
    input.setAttribute('readonly', '');
    input.value = toText(options.value);
    var button = iconButton('base-row-btn base-copy-button', 'content_copy', copyLabel);
    var status = make('span', 'base-sr-only', { role: 'status' });
    status.id = nextId('copy');
    root.appendChild(input);
    // A single line input cuts a long value, so a wrapped field shows it as read-only text that breaks anywhere.
    var text: HTMLElement | null = null;
    if (wrap) {
        input.hidden = true;
        text = make('div', 'base-copy-field-text' + (mono ? ' ' + mono : ''), { role: 'textbox', 'aria-readonly': 'true', 'aria-multiline': 'true', 'aria-label': options.label || 'Value', tabindex: '0' }, input.value);
        root.appendChild(text);
        var shown = text;
        cleanups.push(listen(shown, 'focus', function () { selectText(shown); }));
        cleanups.push(listen(shown, 'keydown', function (e: Event) {
            var key = e as KeyboardEvent;
            if ((key.ctrlKey || key.metaKey) && (key.key === 'a' || key.key === 'A')) {
                key.preventDefault();
                selectText(shown);
            }
        }));
    }
    if (options.secret && options.allowExpose) {
        input.setAttribute('data-base-reveal', '');
        input.setAttribute('data-base-reveal-label', options.revealLabel || baseText('Base.Show'));
        input.setAttribute('data-base-hide-label', options.hideLabel || baseText('Hide'));
        var adorned = adornField(input);
        var eye = root.querySelector('.base-adorned-eye');
        if (eye) eye.classList.add('base-copy-reveal');
        cleanups.push(function () { adorned.destroy(); });
    }
    root.appendChild(button);
    root.appendChild(status);

    function copy(): Promise<boolean> {
        var value = input.value;
        return copyToClipboard(value).then(function (ok) {
            var text = ok ? (options!.copiedText || baseText('Copied')) : (options!.failedText || baseText('Base.CopyFailed'));
            status.textContent = text;
            button.classList.toggle('success', ok);
            button.title = text;
            button.children[0].textContent = ok ? 'check' : 'error_outline';
            clearTimeout(timer as ReturnType<typeof setTimeout>);
            timer = setTimeout(function () {
                button.classList.remove('success');
                button.title = copyLabel;
                button.children[0].textContent = 'content_copy';
                status.textContent = '';
            }, options!.feedbackMs || 1500);
            if (options!.onCopy) options!.onCopy(value, ok);
            return ok;
        });
    }

    cleanups.push(listen(button, 'click', copy));

    return {
        element: root,
        input: input,
        getValue: function () { return input.value; },
        setValue: function (value: unknown) {
            input.value = toText(value);
            if (text) text.textContent = input.value;
        },
        copy: copy,
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () { clearTimeout(timer as ReturnType<typeof setTimeout>); runAll(cleanups); }
    };
}

// Selects all of a wrapped value's text, as focusing or Ctrl+A in a read-only input would.
function selectText(el: HTMLElement): void {
    if (typeof window.getSelection !== 'function' || typeof document.createRange !== 'function') return;
    var selection = window.getSelection();
    if (!selection) return;
    var range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
}
