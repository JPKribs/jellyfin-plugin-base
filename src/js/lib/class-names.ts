// class-names.ts
// Turns a value from data into class names that are safe in a class attribute. It is not exported from the bundle.

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
