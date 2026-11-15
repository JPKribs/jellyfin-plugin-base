/**
 * Returns a random RFC 4122 version 4 GUID for keying new config entities on the client.
 *
 * @param opts { compact: true } leaves out the dashes [optional]
 */
export function generateGuid(opts?: { compact?: boolean }): string {
    var pattern = opts && opts.compact ? 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx' : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return pattern.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Resolves to the reason a failed request gave, such as the Error of a 400 response's JSON body, or to fallback.
 *
 * @param err what apiRequest rejected with, or a { Error } object
 * @param fallback text when there is no reason (default "Could not save.")
 */
export function errorText(err: any, fallback?: string): Promise<string> {
    var otherwise = fallback || 'Could not save.';
    // Reads a plugin's own { Error } or the title and detail of ASP.NET problem details.
    var pick = function (body: any): string { return (body && (body.Error || body.error || body.detail || body.title || body.message)) || otherwise; };
    if (err && typeof err.json === 'function') {
        return err.json().then(pick, function () { return otherwise; });
    }
    return Promise.resolve(err && (err.Error || err.error) ? pick(err) : otherwise);
}

/**
 * Returns a function that runs fn once calls have paused for ms milliseconds, with the latest arguments. The returned function has cancel() to drop a pending call.
 *
 * @param fn the function to debounce
 * @param ms quiet period in milliseconds (default 300)
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms?: number): ((...args: A) => void) & { cancel(): void } {
    var timer: ReturnType<typeof setTimeout> | null = null;
    function debounced(this: unknown) {
        var self = this;
        var args = arguments;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () { timer = null; fn.apply(self, args as unknown as A); }, ms == null ? 300 : ms);
    }
    debounced.cancel = function () { if (timer) { clearTimeout(timer); timer = null; } };
    return debounced;
}

/**
 * Saves a value as a pretty-printed JSON file through the browser's download, for exporting configuration.
 *
 * @param filename the suggested file name, such as "channels.json"
 * @param value the value to serialize
 */
export function downloadJson(filename: string, value: unknown): void {
    var blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename || 'export.json';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
}

/** Opens a file picker for a JSON file and resolves to its parsed value, or to null when the picker is cancelled. It rejects when the file is not valid JSON or cannot be read. */
export function pickJsonFile(): Promise<any> {
    return new Promise(function (resolve, reject) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);
        function cleanup() { if (input.parentNode) input.parentNode.removeChild(input); }
        input.addEventListener('cancel', function () { cleanup(); resolve(null); });
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            cleanup();
            if (!file) { resolve(null); return; }
            var reader = new FileReader();
            reader.onload = function () {
                try { resolve(JSON.parse(reader.result as string)); } catch (e) { reject(new Error('The file is not valid JSON.')); }
            };
            reader.onerror = function () { reject(new Error('The file could not be read.')); };
            reader.readAsText(file);
        });
        input.click();
    });
}

/**
 * Returns the count, a space, and the matching word, such as "1 item" and "3 items". Only a count of exactly 1 takes the singular.
 *
 * @param count number
 * @param one the singular word
 * @param many the plural word (default the singular word and "s")
 */
export function plural(count: number, one: string, many?: string | null): string {
    return count + ' ' + (count === 1 ? one : (many === undefined || many === null ? one + 's' : many));
}

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

// Copies text through a hidden textarea and execCommand, for HTTP dashboards without navigator.clipboard.
function legacyCopy(text: unknown): boolean {
    var area = document.createElement('textarea');
    area.value = text == null ? '' : String(text);
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-9999px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
}

/**
 * Copies text to the clipboard, with a textarea fallback for HTTP dashboards. The promise resolves to true when the copy worked and never rejects. The shared bag's copyToClipboard calls it.
 *
 * @param text string
 */
export function copyToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
            .then(function () { return true; })
            .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
}
