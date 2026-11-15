/** The status colors every colored component takes by name. */
export var COLOR_NAMES: string[] = ['green', 'red', 'orange', 'purple', 'blue', 'gray', 'yellow', 'pink', 'teal'];

var HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Says whether a color is a hex code such as '#e91e63', which a component draws as its custom color.
 *
 * @param color the color option
 * @returns true for a 3, 4, 6, or 8 digit hex code with its #
 */
export function isHexColor(color: unknown): color is string {
    return typeof color === 'string' && HEX.test(color.trim());
}

/**
 * Picks black or white text for a fill, whichever reads better on it.
 *
 * @param hex a hex code
 * @returns '#000' on a light fill and '#fff' on a dark one
 */
export function textOn(hex: string): string {
    var h = hex.trim().slice(1);
    if (h.length <= 4) h = h.split('').map(function (c) { return c + c; }).join('');
    var channels = [0, 2, 4].map(function (i) {
        var c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    var lum = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    // White passes 4.5 to 1 only on fills darker than about 0.18, so lighter fills take black.
    return lum > 0.179 ? '#000' : '#fff';
}

/**
 * The class a color option adds: the name for a status color, custom for a hex code, and the fallback for anything else.
 *
 * @param color the color option, a status color name or a hex code
 * @param fallback the class for a missing or unknown color [optional]
 * @returns the class, or '' with no fallback
 */
export function colorClass(color: unknown, fallback?: string): string {
    if (typeof color === 'string' && COLOR_NAMES.indexOf(color) !== -1) return color;
    if (isHexColor(color)) return 'custom';
    return fallback || '';
}

/**
 * The style attribute a hex color needs in markup built as text, such as count cards. It is empty for a status color name.
 *
 * @param color the color option
 * @returns ' style="--base-custom: #hex; --base-custom-on: #fff"' for a hex code, else ''
 */
export function colorStyle(color: unknown): string {
    if (!isHexColor(color)) return '';
    var hex = color.trim();
    return ' style="--base-custom: ' + hex + '; --base-custom-on: ' + textOn(hex) + '"';
}

/**
 * Colors an element by a color option. It swaps out any earlier color class, adds the new one, and for a hex code sets
 * --base-custom and --base-custom-on, which every component's custom rule reads.
 *
 * @param el the element
 * @param color a status color name or a hex code
 * @param fallback the class for a missing or unknown color [optional]
 * @returns the class it added, or ''
 */
export function applyColor(el: HTMLElement, color: unknown, fallback?: string): string {
    COLOR_NAMES.concat('custom').forEach(function (name) { el.classList.remove(name); });
    var cls = colorClass(color, fallback);
    if (cls) el.classList.add(cls);
    if (cls === 'custom') {
        var hex = (color as string).trim();
        el.style.setProperty('--base-custom', hex);
        el.style.setProperty('--base-custom-on', textOn(hex));
    } else {
        el.style.removeProperty('--base-custom');
        el.style.removeProperty('--base-custom-on');
    }
    return cls;
}

/** A color as red, green, and blue from 0 to 255, and alpha from 0 to 1. */
export interface Rgba {
    r: number;
    g: number;
    b: number;
    a: number;
}

/**
 * Reads a color from a hex code (#rgb, #rgba, #rrggbb, #rrggbbaa) or rgb() and rgba() text.
 *
 * @param text the color text
 * @returns { r, g, b, a }, or null when the text is not a color
 */
export function parseColor(text: unknown): Rgba | null {
    if (typeof text !== 'string') return null;
    var t = text.trim().toLowerCase();
    if (isHexColor(t)) {
        var h = t.slice(1);
        if (h.length <= 4) h = h.split('').map(function (c) { return c + c; }).join('');
        return {
            r: parseInt(h.slice(0, 2), 16),
            g: parseInt(h.slice(2, 4), 16),
            b: parseInt(h.slice(4, 6), 16),
            a: h.length === 8 ? Math.round(parseInt(h.slice(6, 8), 16) / 255 * 100) / 100 : 1
        };
    }
    var m = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(t);
    if (!m) return null;
    var rgb = [m[1], m[2], m[3]].map(Number);
    if (rgb.some(function (n) { return n > 255; })) return null;
    var a = 1;
    if (m[4] !== undefined) {
        a = m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
        if (!(a >= 0 && a <= 1)) return null;
    }
    return { r: rgb[0], g: rgb[1], b: rgb[2], a: a };
}

/**
 * Writes a color as a hex code, #rrggbb, or #rrggbbaa when alpha is wanted.
 *
 * @param color the color
 * @param alpha true adds the alpha pair
 * @returns the hex code in lower case
 */
export function toHexColor(color: Rgba, alpha?: boolean): string {
    function pair(n: number): string { var s = Math.max(0, Math.min(255, Math.round(n))).toString(16); return s.length < 2 ? '0' + s : s; }
    return '#' + pair(color.r) + pair(color.g) + pair(color.b) + (alpha ? pair(color.a * 255) : '');
}

// The status tokens' values, used only when the page's computed token cannot be read.
var TOKEN_HEX: Record<string, string> = {
    green: '#5cb85c', red: '#d9534f', orange: '#f0ad4e', purple: '#9b59b6', blue: '#3498db',
    gray: '#999999', yellow: '#e0c84e', pink: '#e85d9a', teal: '#26a69a'
};

/**
 * Reads a color option as numbers: a hex code, rgb() text, or a status color name through its token on the page.
 *
 * @param color the color option
 * @param scope the element whose tokens to read (default the document root)
 * @returns { r, g, b, a }, or null when it is not a color
 */
export function resolveColor(color: unknown, scope?: Element | null): Rgba | null {
    var direct = parseColor(color);
    if (direct) return direct;
    if (typeof color !== 'string' || COLOR_NAMES.indexOf(color) === -1) return null;
    var value = '';
    try {
        var el = scope || (typeof document !== 'undefined' ? document.documentElement : null);
        if (el && typeof getComputedStyle === 'function') value = getComputedStyle(el).getPropertyValue('--base-' + color + '-fg').trim();
    } catch (e) { value = ''; }
    return parseColor(value) || parseColor(TOKEN_HEX[color]);
}

// RGB to red, yellow, blue, after Sugita and Takahashi, so colors mix as paint does.
function toRyb(c: Rgba): number[] {
    var r = c.r, g = c.g, b = c.b;
    var w = Math.min(r, g, b);
    r -= w; g -= w; b -= w;
    var mg = Math.max(r, g, b);
    var y = Math.min(r, g);
    r -= y; g -= y;
    if (b && g) { b /= 2; g /= 2; }
    y += g; b += g;
    var my = Math.max(r, y, b);
    if (my) { var n = mg / my; r *= n; y *= n; b *= n; }
    return [r + w, y + w, b + w];
}

function fromRyb(ryb: number[]): Rgba {
    var r = ryb[0], y = ryb[1], b = ryb[2];
    var w = Math.min(r, y, b);
    r -= w; y -= w; b -= w;
    var my = Math.max(r, y, b);
    var g = Math.min(y, b);
    y -= g; b -= g;
    if (b && g) { b *= 2; g *= 2; }
    r += y; g += y;
    var mg = Math.max(r, g, b);
    if (mg) { var n = my / mg; r *= n; g *= n; b *= n; }
    return { r: Math.round(r + w), g: Math.round(g + w), b: Math.round(b + w), a: 1 };
}

/**
 * Mixes colors as paint does, by weight, so red and yellow make orange and yellow and blue make green.
 *
 * @param parts array of { color, weight } where color is any color option and weight its share
 * @param scope the element whose tokens a status color name reads [optional]
 * @returns the mixed color as #rrggbb, or '' with nothing to mix
 */
export function mixColors(parts: Array<{ color: unknown; weight: number }>, scope?: Element | null): string {
    var sum = [0, 0, 0];
    var total = 0;
    var bright = 0;
    parts.forEach(function (p) {
        var c = resolveColor(p.color, scope);
        if (!c || !(p.weight > 0)) return;
        var ryb = toRyb(c);
        sum[0] += ryb[0] * p.weight; sum[1] += ryb[1] * p.weight; sum[2] += ryb[2] * p.weight;
        bright += Math.max(c.r, c.g, c.b) * p.weight;
        total += p.weight;
    });
    if (!total) return '';
    var mixed = fromRyb([sum[0] / total, sum[1] / total, sum[2] / total]);
    // Mixing dims a color, so it is brought back to the brightness of the colors it came from.
    var top = Math.max(mixed.r, mixed.g, mixed.b);
    var scale = top ? (bright / total) / top : 1;
    return toHexColor({ r: mixed.r * scale, g: mixed.g * scale, b: mixed.b * scale, a: 1 });
}
