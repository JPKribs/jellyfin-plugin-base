/** What loadTranslations takes. language overrides the viewer's own, and userId names whose display settings to read. */
export interface TranslationsOptions {
    language?: string;
    userId?: string;
}

/** What loadTranslations returns. tr reads one string, format fills its placeholders, and apply translates marked markup. */
export interface TranslationsHandle {
    language: string;
    strings: Record<string, string>;
    tr(key: string, fallback?: string): string;
    format(key: string, ...args: unknown[]): string;
    has(key: string): boolean;
    apply(root?: ParentNode): void;
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
 * Builds a translations handle over strings already loaded.
 *
 * @param strings strings by key
 * @param language language the strings are in (default en-us)
 */
export function createTranslations(strings: Record<string, string>, language?: string): TranslationsHandle {
    var own = strings || {};
    var handle: TranslationsHandle = {
        language: language || 'en-us',
        strings: own,
        tr: function (key: string, fallback?: string) {
            return Object.prototype.hasOwnProperty.call(own, key) ? own[key] : fallback !== undefined ? fallback : key;
        },
        format: function (key: string, ...args: unknown[]) {
            return formatText(handle.tr(key), ...args);
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
 * language. It never rejects. A failed load gives a handle with no strings, so every tr falls back.
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
            .then(function (strings: Record<string, string>) {
                if (!strings || typeof strings !== 'object' || Array.isArray(strings)) strings = {};
                return createTranslations(strings, language);
            });
        // A failed load is not kept, so the next call asks again.
        loaded[address].then(function (handle) {
            if (!Object.keys(handle.strings).length) delete loaded[address];
        });
    }
    return loaded[address];
}
