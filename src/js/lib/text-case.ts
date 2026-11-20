// text-case.ts
// The casing core: title case and sentence case for English text, by the same rules as TextCase in C#.
// translations.ts makes titleCase and sentenceCase public.

/** The words Base keeps as written in every plugin, as TextCase.DefaultExceptions in C#. Internal to the web components. */
export var DEFAULT_CASING: string[] = ['Jellyfin', 'TV', 'ID', 'API', 'URL', 'HTTP', 'HTTPS', 'IP', 'DNS', 'HDR', 'SDR', '4K'];

var MINOR: Record<string, true> = {};
['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'via', 'vs', 'with'].forEach(function (w) { MINOR[w] = true; });

var LETTER_OR_DIGIT = /[\p{L}\p{Nd}]/u;
var LETTER = /\p{L}/u;
var DIGIT = /\p{Nd}/u;
var UPPER = /\p{Lu}/u;
var SPACE = /\s/;

/** Tells whether text in a language is converted, which only English is. Internal to the web components. */
export function isEnglish(language?: string | null): boolean {
    var code = String(language || '').trim().replace(/_/g, '-').toLowerCase();
    return code === '' || code === 'en' || code.indexOf('en-') === 0;
}

/** Every list in order, a later spelling of a word replacing an earlier one, the longest first. Internal to the web components. */
export function mergeCasing(...lists: Array<string[] | null | undefined>): string[] {
    var merged: string[] = [];
    lists.forEach(function (list) {
        (list || []).forEach(function (word) {
            if (typeof word !== 'string' || !word.trim()) return;
            var trimmed = word.trim();
            var lower = trimmed.toLowerCase();
            var at = -1;
            merged.forEach(function (w, i) { if (w.toLowerCase() === lower) at = i; });
            if (at >= 0) merged[at] = trimmed;
            else merged.push(trimmed);
        });
    });
    return merged.map(function (w, i) { return { w: w, i: i }; })
        .sort(function (a, b) { return b.w.length - a.w.length || a.i - b.i; })
        .map(function (p) { return p.w; });
}

function isWordChar(c: string | undefined): boolean {
    return c !== undefined && LETTER_OR_DIGIT.test(c);
}

function upper(word: string): string {
    if (!word) return word;
    var first = word.charAt(0).toUpperCase();
    return (first.length === 1 ? first : word.charAt(0)) + word.slice(1);
}

function fill(kept: boolean[], from: number, count: number): void {
    for (var i = from; i < from + count; i++) kept[i] = true;
}

function anyKept(kept: boolean[], from: number, count: number): boolean {
    for (var i = from; i < from + count; i++) if (kept[i]) return true;
    return false;
}

// The character before a word, past any spaces. A sentence opens only after a space, so 1.5 never does.
function before(chars: string[], start: number, needSpace: boolean): string {
    var i = start - 1;
    while (i >= 0 && SPACE.test(chars[i])) i--;
    return i < 0 || (needSpace && i === start - 1) ? '' : chars[i];
}

/**
 * Converts English text to title case or sentence case, keeping placeholders and the exceptions as written.
 * Any other language returns the text as it is. opening false writes sentence case for text that sits inside a
 * sentence, so its first word is lowered too. Internal to the web components.
 */
export function convertCase(text: string, exceptions: string[], language: string | null | undefined, title: boolean, opening?: boolean): string {
    var source = String(text === undefined || text === null ? '' : text);
    if (!source || !isEnglish(language)) return source;
    var chars = source.split('');
    var kept: boolean[] = chars.map(function () { return false; });

    for (var i = 0; i < chars.length; i++) {
        if (chars[i] !== '{') continue;
        var close = i + 1;
        while (close < chars.length && chars[close] !== '}' && chars[close] !== '{' && !SPACE.test(chars[close])) close++;
        if (close < chars.length && chars[close] === '}') {
            fill(kept, i, close - i + 1);
            i = close;
        }
    }

    var lowerSource = source.toLowerCase();
    mergeCasing(exceptions).forEach(function (exception) {
        var needle = exception.toLowerCase();
        var from = 0;
        while (from <= source.length - exception.length) {
            var at = lowerSource.indexOf(needle, from);
            if (at < 0) return;
            var end = at + exception.length;
            var whole = !isWordChar(chars[at - 1]) && !isWordChar(chars[end]);
            if (whole && !anyKept(kept, at, exception.length)) {
                for (var j = 0; j < exception.length; j++) chars[at + j] = exception.charAt(j);
                fill(kept, at, exception.length);
                from = end;
            } else {
                from = at + 1;
            }
        }
    });

    // Runs of letters and digits, joined across an apostrophe between two of them, such as don't.
    var words: Array<[number, number]> = [];
    var p = 0;
    while (p < chars.length) {
        if (!isWordChar(chars[p])) { p++; continue; }
        var q = p;
        while (q < chars.length && (isWordChar(chars[q]) || ((chars[q] === "'" || chars[q] === '’') && isWordChar(chars[q + 1])))) q++;
        words.push([p, q]);
        p = q;
    }

    words.forEach(function (range, k) {
        var start = range[0];
        var end = range[1];
        if (anyKept(kept, start, end - start)) return;
        var word = chars.slice(start, end).join('');
        if (UPPER.test(word.slice(1)) || (DIGIT.test(word) && LETTER.test(word))) return;
        var lower = word.toLowerCase();
        var written: string;
        if (title) {
            var hyphen = chars[start - 1] === '-' || chars[end] === '-';
            var free = k === 0 || k === words.length - 1 || hyphen || before(chars, start, false) === ':';
            written = !free && MINOR[lower] ? lower : upper(word);
        } else {
            var mark = before(chars, start, true);
            written = (k === 0 && opening !== false) || mark === '.' || mark === '!' || mark === '?' ? upper(lower) : lower;
        }
        for (var c = 0; c < written.length && c < end - start; c++) chars[start + c] = written.charAt(c);
    });

    return chars.join('');
}
