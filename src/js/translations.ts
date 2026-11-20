import { setCurrentTranslations, getCurrentTranslations } from './lib/base-text.js';
import { convertCase, mergeCasing, DEFAULT_CASING } from './lib/text-case.js';

/** What loadTranslations takes. language overrides the viewer's own, and userId names whose display settings to read. */
export interface TranslationsOptions {
    language?: string;
    userId?: string;
}

/**
 * What loadTranslations returns. tr reads one string, format fills its placeholders, title and sentence read one in
 * title case or sentence case, and apply translates marked markup. casing is the plugin's casing list.
 */
export interface TranslationsHandle {
    language: string;
    strings: Record<string, string>;
    casing: string[];
    tr(key: string, fallback?: string): string;
    format(key: string, ...args: unknown[]): string;
    title(key: string): string;
    sentence(key: string): string;
    has(key: string): boolean;
    apply(root?: ParentNode): void;
}

/** What titleCase and sentenceCase take. exceptions are words or phrases kept as written, and language is the text's language. */
export interface CaseOptions {
    exceptions?: string[];
    language?: string;
}

var loaded: Record<string, Promise<TranslationsHandle>> = {};

/**
 * Fills the {0}, {1} placeholders of a text with the values after it. A placeholder with no value is kept.
 *
 * @param text text with placeholders
 * @param args values for the placeholders, in order
 */
export function formatText(text: string, ...args: unknown[]): string {
    return String(text).replace(/\{(\d+)\}/g, function (m: string, i: string) {
        var value = args[+i];
        return value === undefined || value === null ? m : String(value);
    });
}

/**
 * Reads the viewer's language as the web client picks it: their display setting, else the browser's language.
 *
 * @param userId user whose display settings to read, the signed in user by default [optional]
 * @returns the language code, such as de or pt-br
 */
export function currentLanguage(userId?: string): string {
    var id = userId || (typeof ApiClient !== 'undefined' && ApiClient && ApiClient.getCurrentUserId ? ApiClient.getCurrentUserId() : '');
    var saved = '';
    try {
        saved = id ? localStorage.getItem(id + '-language') || '' : '';
    } catch (e) {
        saved = '';
    }
    var picked = saved || (typeof navigator !== 'undefined' && (navigator.language || (navigator.languages && navigator.languages[0]))) || 'en-us';
    return picked.replace(/_/g, '-').toLowerCase();
}

/**
 * Writes English text in title case, such as "Allow Media Playback", with the same rules as TextCase.ToTitleCase in C#.
 * Short words such as of and the stay lower case unless first, last, or after a colon. Any other language returns the
 * text as it is.
 *
 * @param text the text
 * @param options { exceptions, language } where exceptions are added to Base's defaults and the casing list of the page's current translations [optional]
 */
export function titleCase(text: string, options?: CaseOptions): string {
    return caseOf(text, options, true);
}

/**
 * Writes English text in sentence case, such as "Allow media playback", with the same rules as
 * TextCase.ToSentenceCase in C#. Words with a capital inside them, such as TV or iPhone, stay as written. Any other
 * language returns the text as it is.
 *
 * @param text the text
 * @param options { exceptions, language } where exceptions are added to Base's defaults and the casing list of the page's current translations [optional]
 */
export function sentenceCase(text: string, options?: CaseOptions): string {
    return caseOf(text, options, false);
}

function caseOf(text: string, options: CaseOptions | undefined, title: boolean): string {
    var page = getCurrentTranslations();
    var words = mergeCasing(DEFAULT_CASING, page ? page.casing : null, options && options.exceptions);
    return convertCase(text, words, options ? options.language : undefined, title);
}

/**
 * The page's current translations: the handle loadTranslations gave last, which every component reads its default
 * text from. null until a load finishes.
 *
 * @returns the handle, or null
 */
export function currentTranslations(): TranslationsHandle | null {
    return getCurrentTranslations();
}

/**
 * Builds a translations handle over strings already loaded.
 *
 * @param strings strings by key
 * @param language language the strings are in (default en-us)
 * @param casing the plugin's casing list, kept as written by title and sentence [optional]
 */
export function createTranslations(strings: Record<string, string>, language?: string, casing?: string[]): TranslationsHandle {
    var own = strings || {};
    var words = mergeCasing(DEFAULT_CASING, casing);
    var handle: TranslationsHandle = {
        language: language || 'en-us',
        strings: own,
        casing: words,
        tr: function (key: string, fallback?: string) {
            return Object.prototype.hasOwnProperty.call(own, key) ? own[key] : fallback !== undefined ? fallback : key;
        },
        format: function (key: string, ...args: unknown[]) {
            return formatText(handle.tr(key), ...args);
        },
        title: function (key: string) {
            return convertCase(handle.tr(key), words, handle.language, true);
        },
        sentence: function (key: string) {
            return convertCase(handle.tr(key), words, handle.language, false);
        },
        has: function (key: string) {
            return Object.prototype.hasOwnProperty.call(own, key);
        },
        apply: function (root?: ParentNode) {
            applyTranslations(handle, root);
        }
    };
    return handle;
}

/**
 * Translates marked markup under a root. data-str sets the text, and data-str-title, data-str-label, and
 * data-str-placeholder set the title, aria-label, and placeholder. A key with no string keeps the markup's own text.
 *
 * @param translations handle from loadTranslations
 * @param root element to translate under (default document)
 */
export function applyTranslations(translations: TranslationsHandle, root?: ParentNode): void {
    var scope: ParentNode = root || document;
    function each(attribute: string, set: (node: HTMLElement, text: string) => void) {
        Array.prototype.forEach.call(scope.querySelectorAll('[' + attribute + ']'), function (node: HTMLElement) {
            var key = node.getAttribute(attribute) || '';
            if (translations.has(key)) set(node, translations.tr(key));
        });
    }
    each('data-str', function (node, text) { node.textContent = text; });
    each('data-str-title', function (node, text) { node.title = text; });
    each('data-str-label', function (node, text) { node.setAttribute('aria-label', text); });
    each('data-str-placeholder', function (node, text) { node.setAttribute('placeholder', text); });
}

/**
 * Loads the plugin's strings in the viewer's language from its translations endpoint, once per address and
 * language. It never rejects. A failed load gives a handle with no strings, so every tr falls back. The handle
 * becomes the page's current translations, which components read their default text from, so load them before
 * building components. The endpoint answers with { language, strings, casing }, or with the strings alone.
 *
 * @param url endpoint that returns BaseTranslations.Serve, such as MyPlugin/Translations. A relative one goes through ApiClient.getUrl when the dashboard provides it
 * @param options { language, userId } [optional]
 */
export function loadTranslations(url: string, options?: TranslationsOptions): Promise<TranslationsHandle> {
    var language = (options && options.language ? options.language : currentLanguage(options && options.userId)).replace(/_/g, '-').toLowerCase();
    var absolute = /^([a-z]+:)?\/\//i.test(url) || url.charAt(0) === '/';
    var base = !absolute && typeof ApiClient !== 'undefined' && ApiClient ? ApiClient.getUrl(url) : url;
    var address = base + (base.indexOf('?') === -1 ? '?' : '&') + 'language=' + encodeURIComponent(language);
    if (!loaded[address]) {
        loaded[address] = fetch(address, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : {}; })
            .catch(function () { return {}; })
            .then(function (body: unknown) {
                var data = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
                var wrapped = data.strings && typeof data.strings === 'object' && !Array.isArray(data.strings);
                var strings = (wrapped ? data.strings : data) as Record<string, string>;
                var casing = wrapped && Array.isArray(data.casing) ? (data.casing as unknown[]).filter(function (w) { return typeof w === 'string'; }) as string[] : [];
                return createTranslations(strings, language, casing);
            });
        // A failed load is not kept, so the next call asks again.
        loaded[address].then(function (handle) {
            if (!Object.keys(handle.strings).length) delete loaded[address];
        });
    }
    return loaded[address].then(function (handle) {
        // A failed load keeps the strings an earlier load made current.
        if (Object.keys(handle.strings).length || !getCurrentTranslations()) setCurrentTranslations(handle);
        return handle;
    });
}
