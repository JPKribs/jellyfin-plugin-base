import { make, clear, fillAll, formatBytes, nextId } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import type { ComponentHandle } from './types.js';

/** One part of a segmented usage meter, such as the space movies take. color is a status color name or a hex code. */
export interface UsageMeterPart {
    label: string;
    value: number;
    color?: string;
}

/** What a usage meter shows: how much is used out of a total, or the parts that add up to what is used. */
export interface UsageMeterValue {
    used?: number;
    total?: number;
    parts?: UsageMeterPart[];
}

/** What createUsageMeter takes. bytes formats the numbers as sizes, and unit follows plain numbers. */
export interface UsageMeterOptions extends UsageMeterValue {
    label?: string;
    bytes?: boolean;
    unit?: string;
    warning?: number;
    danger?: number;
    usedText?: string;
    format?(value: number): string;
}

/** What createUsageMeter returns. setValue merges { used, total, parts } and draws again. */
export interface UsageMeterHandle extends ComponentHandle {
    getValue(): UsageMeterValue;
    setValue(next: UsageMeterValue | null): void;
    destroy(): void;
}

// A number as finite and not below zero, else zero.
function amount(n: unknown): number {
    var v = typeof n === 'number' ? n : parseFloat(n as string);
    return isFinite(v) && v > 0 ? v : 0;
}

/**
 * A progress bar that shows how much of something is used, such as disk space, with a label and an "X of Y used" line. The bar turns orange past the warning share and red past the danger share.
 * With parts it is segmented, one colored segment per part, with a legend of the parts and their amounts. It is a meter to a screen reader, with the same line as its value text.
 *
 * @param options {
 *   label    : the name over the bar, such as 'Storage' [optional]
 *   used     : how much is used (default the sum of the parts, else 0)
 *   total    : the whole (default 0, which shows an empty bar)
 *   parts    : [{ label, value, color }] that split what is used into segments, color a status color name or a hex code (default the series colors) [optional]
 *   bytes    : true writes the numbers as sizes, such as 2.4 GB (default false)
 *   unit     : text after plain numbers, such as 'items' [optional]
 *   warning  : percent of the total from which the bar turns orange (default 80)
 *   danger   : percent of the total from which the bar turns red (default 95)
 *   usedText : the line, where {used}, {total}, and {percent} are filled in (default '{used} of {total} used')
 *   format   : function(value) returning the text of an amount, which wins over bytes and unit [optional]
 * }
 * @returns { element, getValue, setValue, destroy }. setValue merges { used, total, parts } and draws again.
 */
export function createUsageMeter(options?: UsageMeterOptions): UsageMeterHandle {
    var opts = options || {};
    var state: UsageMeterValue = { used: opts.used, total: opts.total, parts: opts.parts };
    var warning = typeof opts.warning === 'number' ? opts.warning : 80;
    var danger = typeof opts.danger === 'number' ? opts.danger : 95;
    var colors = ['blue', 'green', 'purple', 'teal', 'pink', 'yellow'];

    var root = make('div', 'base-usage-meter');
    var head = make('div', 'base-usage-meter-head');
    var labelId = nextId('usage');
    var labelEl = make('span', 'base-usage-meter-label', { id: labelId }, opts.label || '');
    var textEl = make('span', 'base-usage-meter-text');
    head.appendChild(labelEl);
    head.appendChild(textEl);
    var bar = make('div', 'base-progress base-usage-meter-bar', { role: 'meter', 'aria-valuemin': '0' });
    if (opts.label) bar.setAttribute('aria-labelledby', labelId);
    else bar.setAttribute('aria-label', 'Usage');
    var legend = make('div', 'base-usage-meter-legend');
    root.appendChild(head);
    root.appendChild(bar);
    root.appendChild(legend);

    function text(v: number): string {
        if (typeof opts.format === 'function') return opts.format(v);
        if (opts.bytes) return formatBytes(v);
        return String(parseFloat(v.toFixed(2))) + (opts.unit ? ' ' + opts.unit : '');
    }

    function draw(): void {
        var parts = (state.parts || []).filter(function (p) { return p && amount(p.value) > 0; });
        var used = state.used !== undefined && state.used !== null ? amount(state.used) : parts.reduce(function (sum, p) { return sum + amount(p.value); }, 0);
        var total = amount(state.total);
        var share = total ? Math.min(100, used / total * 100) : 0;
        var line = fillAll(opts.usedText || '{used} of {total} used', { used: text(used), total: text(total), percent: Math.round(share) + '%' });
        textEl.textContent = line;
        bar.setAttribute('aria-valuemax', String(total));
        bar.setAttribute('aria-valuenow', String(Math.min(used, total)));
        bar.setAttribute('aria-valuetext', line);
        // The bar warns by its share of the total, so a nearly full disk turns orange, then red.
        var level = share >= danger ? 'danger' : (share >= warning ? 'warning' : '');
        root.classList.toggle('warning', level === 'warning');
        root.classList.toggle('danger', level === 'danger');
        clear(bar);
        clear(legend);
        legend.hidden = parts.length < 2;
        if (!parts.length) {
            var fill = make('div', 'base-progress-bar base-usage-meter-fill whole');
            fill.style.setProperty('--base-usage-share', share + '%');
            bar.appendChild(fill);
            return;
        }
        parts.forEach(function (p, i) {
            var piece = make('div', 'base-progress-bar base-usage-meter-fill', { title: p.label + ', ' + text(amount(p.value)) });
            piece.style.setProperty('--base-usage-share', (total ? Math.min(100, amount(p.value) / total * 100) : 0) + '%');
            applyColor(piece, p.color || colors[i % colors.length]);
            bar.appendChild(piece);
            if (parts.length < 2) return;
            var key = make('span', 'base-usage-meter-key');
            var swatch = make('span', 'base-chart-swatch', { 'aria-hidden': 'true' });
            applyColor(swatch, p.color || colors[i % colors.length]);
            key.appendChild(swatch);
            key.appendChild(make('span', null, null, p.label));
            key.appendChild(make('span', 'base-usage-meter-amount', null, text(amount(p.value))));
            legend.appendChild(key);
        });
    }

    draw();
    return {
        element: root,
        getValue: function () { return { used: state.used, total: state.total, parts: (state.parts || []).slice() }; },
        setValue: function (next) {
            state = Object.assign({}, state, next || {});
            draw();
        },
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
