// Copies text through a hidden textarea and execCommand, for HTTP dashboards without navigator.clipboard.
function legacyCopy(text) {
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

// copyToClipboard
// Copies text to the clipboard, with a textarea fallback for HTTP dashboards. The promise resolves to true when the copy worked and never rejects. The shared bag's copyToClipboard calls it.
//
// Param: text | string
export function copyToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
            .then(function () { return true; })
            .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
}
