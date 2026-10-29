// Placeholder hints.
//
// A field that takes placeholders such as {title} gets a Placeholders hint under it, where Jellyfin puts a
// field's help. The hint shows the placeholders the field takes as buttons, and pressing one puts it in at the
// cursor. The markup is plain HTML, so it works in strings built for dialogs; bindPlaceholders handles every
// hint inside a root at once.

import { escapeHtml } from './escape.js';

// insertAtCursor
// Puts text into an input or text area at the cursor, replacing any selection, and leaves the cursor after it.
//
// Param: field | the input or textarea
// Param: text  | the text to put in
export function insertAtCursor(field, text) {
    if (!field) return;
    var start = typeof field.selectionStart === 'number' ? field.selectionStart : field.value.length;
    var end = typeof field.selectionEnd === 'number' ? field.selectionEnd : start;
    field.value = field.value.slice(0, start) + text + field.value.slice(end);
    field.selectionStart = field.selectionEnd = start + text.length;
    field.focus();
    field.dispatchEvent(new Event('input', { bubbles: true }));
}

// placeholderHint
// Returns a field's Placeholders hint and the hidden list it shows. Put it after the field, in the same
// inputContainer, so the label above the field stays a plain label.
//
// Param: placeholders | [[name, description], ...] where name is used as {name}
export function placeholderHint(placeholders) {
    return '<div class="jpk-placeholder-hint">'
        + '<button type="button" class="jpk-hint-button" data-jpk-hint aria-expanded="false">'
        + '<span class="material-icons" aria-hidden="true">help_outline</span>Placeholders</button>'
        + '<div class="jpk-placeholders" hidden><span class="jpk-tags">' + (placeholders || []).map(function (p) {
            return '<button type="button" class="jpk-tag jpk-tag-button" data-jpk-placeholder="' + escapeHtml(p[0]) + '" title="' + escapeHtml(p[1] || '') + '">{'
                + escapeHtml(p[0]) + '}</button>';
        }).join('') + '</span></div></div>';
}

// bindPlaceholders
// Makes every hint inside root work: Placeholders shows or hides the list, and a placeholder goes into the field
// in the same inputContainer at the cursor. Binds once per root.
//
// Param: root     | element holding the fields
// Param: onInsert | function(field) called after a placeholder goes in [optional]
export function bindPlaceholders(root, onInsert) {
    if (!root || root.dataset.jpkPlaceholders) return;
    root.dataset.jpkPlaceholders = '1';
    // Pressing a placeholder keeps the focus in the field, so it goes where the cursor is.
    root.addEventListener('mousedown', function (e) {
        if (e.target.closest('[data-jpk-placeholder]')) e.preventDefault();
    });
    root.addEventListener('click', function (e) {
        var hint = e.target.closest('[data-jpk-hint]');
        var chip = e.target.closest('[data-jpk-placeholder]');
        if (!hint && !chip) return;
        e.preventDefault();
        var container = (hint || chip).closest('.inputContainer');
        if (!container) return;
        if (hint) {
            var list = container.querySelector('.jpk-placeholders');
            if (!list) return;
            list.hidden = !list.hidden;
            hint.setAttribute('aria-expanded', list.hidden ? 'false' : 'true');
            return;
        }
        var field = container.querySelector('textarea, input');
        insertAtCursor(field, '{' + chip.getAttribute('data-jpk-placeholder') + '}');
        if (onInsert) onInsert(field);
    });
}
