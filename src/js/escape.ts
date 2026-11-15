/**
 * Escapes a value for HTML text or a quoted attribute. null and undefined become ''.
 *
 * @param str any value
 */
export function escapeHtml(str: unknown): string {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Reduces a value to safe CSS class names: whitespace separated tokens of letters, digits, '_' and '-'. Any other
 * character is dropped, so a value from data can never leave the class attribute.
 *
 * @param value a class name, several separated by spaces, or null
 */
export function classNames(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).split(/\s+/)
        .map(function (token) { return token.replace(/[^A-Za-z0-9_-]/g, ''); })
        .filter(Boolean)
        .join(' ');
}
