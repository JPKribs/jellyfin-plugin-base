import { adornField } from './field-adornments.js';
import { make, iconButton, nextId, listen, runAll, applyFieldSize, toText } from './lib/dom.js';
import { copyToClipboard } from './browser-helpers.js';
import type { ComponentHandle } from './types.js';

/** What createCopyField takes. secret masks the value, and allowExpose adds an eye inside the box that shows it. */
export interface CopyFieldOptions {
    value?: unknown;
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

/** What createCopyField returns. copy resolves to whether the copy worked. */
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
 *   mono         : true shows the value in the mono font (default true)
 *   label        : aria-label of the value (default 'Value')
 *   copyLabel    : title and aria-label of the copy button (default 'Copy')
 *   copiedText   : feedback after a copy (default 'Copied.')
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
    var copyLabel = options.copyLabel || 'Copy';

    var root = make('div', 'base-copy-field');
    applyFieldSize(root, options.size);
    var input = make('input', options.mono === false ? '' : 'base-mono', { type: options.secret ? 'password' : 'text', 'aria-label': options.label || 'Value', autocomplete: 'off' });
    input.setAttribute('readonly', '');
    input.value = toText(options.value);
    var button = iconButton('base-row-btn base-copy-button', 'content_copy', copyLabel);
    var status = make('span', 'base-sr-only', { role: 'status' });
    status.id = nextId('copy');
    root.appendChild(input);
    if (options.secret && options.allowExpose) {
        input.setAttribute('data-base-reveal', '');
        input.setAttribute('data-base-reveal-label', options.revealLabel || 'Show');
        input.setAttribute('data-base-hide-label', options.hideLabel || 'Hide');
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
            var text = ok ? (options!.copiedText || 'Copied.') : (options!.failedText || 'Copy failed.');
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
        setValue: function (value: unknown) { input.value = toText(value); },
        copy: copy,
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () { clearTimeout(timer as ReturnType<typeof setTimeout>); runAll(cleanups); }
    };
}
