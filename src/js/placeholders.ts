import { escapeHtml } from './escape.js';

/** One placeholder as [name, description], where name is used as {name}. */
export type Placeholder = string[];

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
 *
 * @param placeholders [[name, description], ...] where name is used as {name}
 */
export function placeholderHint(placeholders?: Placeholder[] | null): string {
    return '<div class="jpk-placeholder-hint">'
        + '<button type="button" class="jpk-hint-button" data-jpk-hint aria-expanded="false">'
        + '<span class="material-icons" aria-hidden="true">help_outline</span>Placeholders</button>'
        + '<div class="jpk-placeholders" hidden><span class="jpk-tags">' + (placeholders || []).map(function (p) {
            return '<button type="button" class="jpk-tag jpk-tag-button" data-jpk-placeholder="' + escapeHtml(p[0]) + '" title="' + escapeHtml(p[1] || '') + '">{'
                + escapeHtml(p[0]) + '}</button>';
        }).join('') + '</span></div></div>';
}

/**
 * Makes every hint inside root work: Placeholders shows or hides the list, and a placeholder goes into the field
 * in the same inputContainer at the cursor. Binds once per root.
 *
 * @param root element holding the fields
 * @param onInsert function(field) called after a placeholder goes in [optional]
 */
export function bindPlaceholders(root: HTMLElement | null, onInsert?: (field: PlaceholderField) => void): void {
    if (!root || root.dataset.jpkPlaceholders) return;
    root.dataset.jpkPlaceholders = '1';
    // Keeps focus in the field while a placeholder is pressed, so it goes in at the cursor.
    root.addEventListener('mousedown', function (e: MouseEvent) {
        if ((e.target as Element).closest('[data-jpk-placeholder]')) e.preventDefault();
    });
    root.addEventListener('click', function (e: MouseEvent) {
        var hint = (e.target as Element).closest('[data-jpk-hint]');
        var chip = (e.target as Element).closest('[data-jpk-placeholder]');
        if (!hint && !chip) return;
        e.preventDefault();
        var container = (hint || chip)!.closest('.inputContainer');
        if (!container) return;
        if (hint) {
            var list = container.querySelector<HTMLElement>('.jpk-placeholders');
            if (!list) return;
            list.hidden = !list.hidden;
            hint.setAttribute('aria-expanded', list.hidden ? 'false' : 'true');
            return;
        }
        var field = container.querySelector<PlaceholderField>('textarea, input');
        insertAtCursor(field, '{' + chip!.getAttribute('data-jpk-placeholder') + '}');
        if (onInsert) onInsert(field!);
    });
}
