import { escapeHtml, copyToClipboard } from './browser-helpers.js';
import { nextId, fill } from './lib/dom.js';
import { setCollapsed } from './collapsible-section.js';
import { baseText } from './lib/base-text.js';

/** One placeholder as [name, description], where name is used as {name}. */
export type Placeholder = string[];

/** How placeholderHint draws its tokens and what pressing one does. open and close wrap each name, and mode copy puts the token on the clipboard instead of in the field. */
export interface PlaceholderHintOptions {
    open?: string;
    close?: string;
    mode?: 'insert' | 'copy';
    label?: string;
    copiedText?: string;
}

/**
 * Wraps a placeholder name in its delimiters, such as title in {title} or {{title}}.
 * Internal to the web components.
 *
 * @param name the placeholder name
 * @param options { open (default '{'), close (default '}') } [optional]
 */
export function placeholderToken(name: unknown, options?: Pick<PlaceholderHintOptions, 'open' | 'close'> | null): string {
    var open = options && typeof options.open === 'string' ? options.open : '{';
    var close = options && typeof options.close === 'string' ? options.close : '}';
    return open + String(name === undefined || name === null ? '' : name) + close;
}

/** A field a placeholder goes into. */
export type PlaceholderField = HTMLInputElement | HTMLTextAreaElement;

/**
 * Puts text into an input or text area at the cursor, replacing any selection, and leaves the cursor after it.
 *
 * @param field the input or textarea
 * @param text the text to put in
 */
export function insertAtCursor(field: PlaceholderField | null, text: string): void {
    if (!field) return;
    var start = typeof field.selectionStart === 'number' ? field.selectionStart : field.value.length;
    var end = typeof field.selectionEnd === 'number' ? field.selectionEnd : start;
    field.value = field.value.slice(0, start) + text + field.value.slice(end);
    field.selectionStart = field.selectionEnd = start + text.length;
    field.focus();
    field.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Returns a field's Placeholders hint and the hidden list it shows. Put it after the field, in the same inputContainer.
 * The hint is a collapsed toggle with aria-expanded and aria-controls on its list, accent while the list shows and gray while it is hidden.
 *
 * @param placeholders [[name, description], ...] where name is drawn between the delimiters, such as {name}
 * @param options {
 *   open       : the opening delimiter (default '{')
 *   close      : the closing delimiter (default '}')
 *   mode       : 'insert' puts the token in the field at the cursor, and 'copy' copies it instead (default 'insert')
 *   label      : the toggle's label (default 'Placeholders')
 *   copiedText : the message after a copy, where {value} is the token (default 'Copied {value}.')
 * } [optional]
 */
export function placeholderHint(placeholders?: Placeholder[] | null, options?: PlaceholderHintOptions | null): string {
    options = options || {};
    var id = nextId('placeholders');
    var copy = options.mode === 'copy';
    return '<div class="base-placeholder-hint' + (copy ? ' copy' : '') + '"' + (copy ? ' data-base-copied="' + escapeHtml(options.copiedText || baseText('Base.CopiedValue')) + '"' : '') + '>'
        + '<button type="button" class="base-hint-button base-icon-text small collapsed" data-base-hint aria-expanded="false" aria-controls="' + id + '">'
        + '<span class="material-icons" aria-hidden="true">help_outline</span><span>' + escapeHtml(options.label || baseText('Base.Placeholders')) + '</span>'
        + '</button>'
        + '<div class="base-placeholders" id="' + id + '" hidden><span class="base-tags">' + (placeholders || []).map(function (p) {
            var token = placeholderToken(p[0], options);
            return '<button type="button" class="base-tag base-tag-button" data-base-placeholder="' + escapeHtml(p[0]) + '" data-base-token="' + escapeHtml(token) + '" title="' + escapeHtml(p[1] || '') + '">'
                + escapeHtml(token) + '</button>';
        }).join('') + '</span>' + (copy ? '<span class="base-sr-only" role="status"></span>' : '') + '</div></div>';
}

/**
 * Makes every hint inside root work: Placeholders shows or hides the list, and a placeholder goes into the field
 * in the same inputContainer at the cursor, or onto the clipboard for a hint in copy mode. Binds once per root.
 *
 * @param root element holding the fields
 * @param onInsert function(field) called after a placeholder goes in [optional]
 */
export function bindPlaceholders(root: HTMLElement | null, onInsert?: (field: PlaceholderField) => void): void {
    if (!root || root.dataset.basePlaceholders) return;
    root.dataset.basePlaceholders = '1';
    // Keeps focus in the field while a placeholder is pressed, so it goes in at the cursor.
    root.addEventListener('mousedown', function (e: MouseEvent) {
        if ((e.target as Element).closest('[data-base-placeholder]')) e.preventDefault();
    });
    root.addEventListener('click', function (e: MouseEvent) {
        var hint = (e.target as Element).closest('[data-base-hint]');
        var chip = (e.target as Element).closest('[data-base-placeholder]');
        if (!hint && !chip) return;
        e.preventDefault();
        var hintRoot = (hint || chip)!.closest('.base-placeholder-hint');
        var container = (hint || chip)!.closest('.inputContainer');
        if (hint) {
            var scope = container || hintRoot;
            var list = scope && scope.querySelector<HTMLElement>('.base-placeholders');
            if (!list) return;
            setCollapsed(hint, list, !list.hidden, true);
            return;
        }
        var token = chip!.getAttribute('data-base-token') || placeholderToken(chip!.getAttribute('data-base-placeholder'));
        // A hint in copy mode needs no field, so it works outside an inputContainer too.
        if (hintRoot && hintRoot.classList.contains('copy')) {
            copyPlaceholder(chip as HTMLElement, hintRoot, token);
            return;
        }
        if (!container) return;
        var field = container.querySelector<PlaceholderField>('textarea, input');
        insertAtCursor(field, token);
        if (onInsert) onInsert(field!);
    });
}

// Copies a token, marks its button and announces the copy for a moment, and reports whether the copy worked.
function copyPlaceholder(chip: HTMLElement, hintRoot: Element, token: string): Promise<boolean> {
    return copyToClipboard(token).then(function (ok: boolean) {
        if (!ok) return false;
        var status = hintRoot.querySelector<HTMLElement>('[role="status"]');
        chip.classList.add('copied');
        if (status) status.textContent = fill(hintRoot.getAttribute('data-base-copied') || baseText('Base.CopiedValue'), token);
        setTimeout(function () {
            chip.classList.remove('copied');
            if (status) status.textContent = '';
        }, 1500);
        return true;
    });
}
