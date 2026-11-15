import { adornField } from './field-adornments.js';
import type { SecretFieldOptions } from './types.js';

/** Sentinel a config page posts back in a secret field to keep the stored value, so the real secret never travels to the browser. It mirrors SecretProtector.KeptSentinel, and the C# side reads the posted value through SecretProtector.ResolveIncoming. */
export var SECRET_KEPT: string = '__JPK_SECRET_KEPT__';

/** The dots a field shows while a secret is stored, so it reads as filled though the browser never gets the value. */
export var SECRET_DOTS: string = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

// Puts the field's own placeholder and title back, as it was before a secret was shown as stored.
function showEmpty(input: HTMLInputElement): void {
    input.placeholder = input.dataset.baseSecretPlaceholder || '';
    if (input.dataset.baseSecretTitle) input.title = input.dataset.baseSecretTitle;
    else input.removeAttribute('title');
    input.classList.remove('base-secret-stored');
}

/**
 * Prepares a secret input so the stored secret never reaches the browser. While a secret is stored the field is empty
 * and shows eight dots, so it reads as filled, with a hint in its title. Call it after every load, since a save may
 * change whether a secret is stored.
 *
 * @param input the input element
 * @param hasStored whether a secret is stored, from SecretProtector.HasSecret on the C# side
 * @param opts { placeholder, the hint in the title (default "Saved, leave blank to keep"), clearButton, allowExpose } where clearButton is shown while a secret is stored and clears it, and allowExpose adds an eye inside the box that shows what was typed (default false) [optional]
 */
export function bindSecretField(input: HTMLInputElement | null, hasStored: boolean, opts?: SecretFieldOptions): void {
    if (!input) return;
    opts = opts || {};
    var clear = opts.clearButton;
    if (clear) {
        clear.classList.toggle('hidden', !hasStored);
        if (!clear.dataset.baseSecretClear) {
            clear.dataset.baseSecretClear = '1';
            clear.addEventListener('click', function () {
                clearSecretField(input);
                clear!.classList.add('hidden');
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }
    }
    // The eye shows only what was typed, since a stored secret never reaches the page.
    if (opts.allowExpose && !input.hasAttribute('data-base-reveal')) {
        input.setAttribute('data-base-reveal', '');
        adornField(input);
    }
    if (input.dataset.baseSecretPlaceholder === undefined) {
        input.dataset.baseSecretPlaceholder = input.placeholder || '';
        input.dataset.baseSecretTitle = input.getAttribute('title') || '';
    }
    input.value = '';
    delete input.dataset.baseSecretCleared;
    if (hasStored) {
        input.dataset.baseSecretStored = '1';
        input.placeholder = SECRET_DOTS;
        input.title = opts.placeholder || 'Saved, leave blank to keep';
        input.classList.add('base-secret-stored');
    } else {
        delete input.dataset.baseSecretStored;
        showEmpty(input);
    }
}

/**
 * Marks a bound secret field to clear the stored secret on the next save, since an empty field otherwise keeps it.
 *
 * @param input the input element
 */
export function clearSecretField(input: HTMLInputElement | null): void {
    if (!input) return;
    input.value = '';
    input.dataset.baseSecretCleared = '1';
    showEmpty(input);
}

/**
 * Returns the value to post for a bound secret field. That is SECRET_KEPT when it is empty and a secret is stored, '' after clearSecretField, and otherwise the typed replacement.
 *
 * @param input the input element
 */
export function readSecretField(input: HTMLInputElement | null): string {
    if (!input) return '';
    if (input.value) return input.value;
    if (input.dataset.baseSecretCleared) return '';
    return input.dataset.baseSecretStored ? SECRET_KEPT : '';
}
