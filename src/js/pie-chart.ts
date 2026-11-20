import { make, listen, runAll, toText } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import { buildChart, svgEl, seriesColor, formatValue } from './lib/chart.js';
import type { ChartFrame, ChartHandle } from './lib/chart.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** One slice of a pie: its name, its amount, and an optional status color name or hex code. */
export interface PieSlice {
    label: string;
    value: number;
    color?: string;
}

/** What createPieChart takes. Each slice is drawn by its share of the total of the positive values. */
export interface PieChartOptions {
    slices?: PieSlice[];
    label?: string;
    donut?: boolean;
    centerText?: string;
    centerLabel?: string;
    unit?: string;
    showLegend?: boolean;
    emptyText?: string;
    valueName?: string;
    size?: 'small' | 'medium' | 'large';
    format?(value: number): string;
    onSelect?(slice: PieSlice | null, index: number): void;
}

/** What createPieChart returns. getValue returns the slices, setValue and setSlices draw new ones, and select picks a slice by index. */
export interface PieChartHandle extends ComponentHandle {
    getValue(): PieSlice[];
    setValue(slices: PieSlice[] | null): void;
    setSlices(slices: PieSlice[] | null): void;
    getSelected(): number;
    select(index: number | null): void;
    redraw(): void;
    destroy(): void;
}

/** The start and end angle of one slice, in radians clockwise from twelve o'clock, and its share of the whole from 0 to 1. */
export interface PieAngle {
    start: number;
    end: number;
    share: number;
}

// The inner radius of a donut as a share of the outer one, so the center leaves room for a total.
var DONUT_HOLE: number = 0.6;
// A two-part layout stacks below this width, as the QR code does.
var COMPACT_WIDTH: number = 480;
var FULL: number = Math.PI * 2;

/**
 * Each value's share of the total of the positive values. Zero, negative, and missing values take a share of 0.
 *
 * @param values the slice values
 * @returns one share per value, from 0 to 1, that add up to 1 when any value is positive
 */
export function pieShares(values: Array<number | null | undefined>): number[] {
    var total = 0;
    values.forEach(function (v) { if (typeof v === 'number' && isFinite(v) && v > 0) total += v; });
    return values.map(function (v) { return total > 0 && typeof v === 'number' && isFinite(v) && v > 0 ? v / total : 0; });
}

/**
 * The angles of each slice, in order clockwise from twelve o'clock, so the slices together close the circle.
 *
 * @param values the slice values
 * @returns one { start, end, share } per value, where a slice with no share starts and ends at the same angle
 */
export function pieAngles(values: Array<number | null | undefined>): PieAngle[] {
    var at = 0;
    return pieShares(values).map(function (share) {
        var start = at;
        at += share * FULL;
        return { start: start, end: at, share: share };
    });
}

/**
 * A share written as a percent: whole numbers from 10%, one decimal under it, and "<0.1%" for a sliver.
 *
 * @param share the share from 0 to 1
 * @returns the text, such as 41%, 4.5%, or 0%
 */
export function percentText(share: number): string {
    if (!(share > 0)) return '0%';
    var pct = share * 100;
    if (pct < 0.05) return '<0.1%';
    return (pct >= 10 ? String(Math.round(pct)) : String(parseFloat(pct.toFixed(1)))) + '%';
}

// A point on a circle at an angle clockwise from twelve o'clock.
function point(cx: number, cy: number, r: number, angle: number): string {
    return (cx + r * Math.sin(angle)).toFixed(2) + ' ' + (cy - r * Math.cos(angle)).toFixed(2);
}

/**
 * The SVG path of one slice, or of a ring when inner is above 0. A slice that spans the whole circle draws as a full disc or ring.
 *
 * @param cx the center x
 * @param cy the center y
 * @param r the outer radius
 * @param inner the inner radius, 0 for a pie
 * @param start the start angle, clockwise from twelve o'clock
 * @param end the end angle
 * @returns the path's d attribute
 */
export function slicePath(cx: number, cy: number, r: number, inner: number, start: number, end: number): string {
    // A whole circle cannot be one arc, since its ends meet, so it is two halves, with the hole cut out by the even-odd rule.
    if (end - start >= FULL - 1e-6) {
        var disc = 'M' + point(cx, cy, r, 0) + ' A' + r + ' ' + r + ' 0 1 1 ' + point(cx, cy, r, Math.PI) + ' A' + r + ' ' + r + ' 0 1 1 ' + point(cx, cy, r, 0) + ' Z';
        if (inner <= 0) return disc;
        return disc + ' M' + point(cx, cy, inner, 0) + ' A' + inner + ' ' + inner + ' 0 1 0 ' + point(cx, cy, inner, Math.PI) + ' A' + inner + ' ' + inner + ' 0 1 0 ' + point(cx, cy, inner, 0) + ' Z';
    }
    var large = end - start > Math.PI ? 1 : 0;
    var d = 'M' + point(cx, cy, r, start) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + point(cx, cy, r, end);
    if (inner <= 0) return d + ' L' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ' Z';
    return d + ' L' + point(cx, cy, inner, end) + ' A' + inner + ' ' + inner + ' 0 ' + large + ' 0 ' + point(cx, cy, inner, start) + ' Z';
}

/**
 * A pie or donut chart on the shared chart core, drawn as inline SVG at a size from the size scale. Each slice is its share of the total, in its color, and is a button
 * whose name and tooltip give its label, value, and percent. A legend beside the pie, or under it when the chart is narrow, lists every slice with its value and percent.
 * A click, Enter, or Space on a slice or a legend row selects it, and again clears it. The core keeps a visually hidden table of every number.
 *
 * @param options {
 *   slices      : [{ label, value, color }] where color is a status color name or a hex code (default the series colors in turn) [optional]
 *   label       : the chart's accessible name and the hidden table's caption [optional]
 *   donut       : true draws a ring with room in the center (default false)
 *   centerText  : the large text in a donut's center, such as the total [optional]
 *   centerLabel : the small text under centerText, such as 'Total' [optional]
 *   unit        : text after each value, such as 'GB' [optional]
 *   format      : function(value) returning the text of a value, which wins over unit [optional]
 *   showLegend  : false hides the legend (default true)
 *   emptyText   : the sentence shown while no slice has a positive value (default 'Nothing to show.')
 *   valueName   : the heading of the value column in the hidden table (default 'Value')
 *   size        : 'small', 'medium', or 'large', the pie's diameter on the size scale (default 'medium')
 *   onSelect    : function(slice, index) called when a slice is selected, and with (null, -1) when it is cleared [optional]
 * }
 * @returns { element, getValue, setValue, setSlices, getSelected, select, redraw, destroy }
 */
export function createPieChart(options?: PieChartOptions): PieChartHandle {
    var opts = options || {};
    var slices: PieSlice[] = copy(opts.slices);
    var shares: number[] = [];
    var selected = -1;
    var marks: SVGElement[] = [];
    var keys: HTMLButtonElement[] = [];
    var cleanups: Array<() => void> = [];
    var legendCleanups: Array<() => void> = [];
    var chart: ChartHandle | null = null;

    function copy(list: PieSlice[] | null | undefined): PieSlice[] {
        return (list || []).map(function (s) { return { label: toText(s.label), value: s.value, color: s.color }; });
    }

    function colorOf(index: number): string {
        return seriesColor({ color: slices[index].color, values: [] }, index);
    }

    function format(value: number): string {
        return formatValue(opts, value);
    }

    function valueOf(index: number): number {
        var v = slices[index].value;
        return typeof v === 'number' && isFinite(v) ? v : 0;
    }

    function nameOf(index: number): string {
        return slices[index].label + ', ' + format(valueOf(index)) + ', ' + percentText(shares[index]);
    }

    function paintSelection(): void {
        // The legend and the slices draw inside buildChart, before the chart's root is returned.
        if (chart) chart.element.classList.toggle('has-selection', selected >= 0);
        marks.forEach(function (el) {
            var on = parseInt(el.getAttribute('data-label') || '-1', 10) === selected;
            el.setAttribute('class', (el.getAttribute('class') || '').replace(/\s*\bselected\b/g, '') + (on ? ' selected' : ''));
            el.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        keys.forEach(function (key, i) {
            key.classList.toggle('selected', i === selected);
            key.setAttribute('aria-pressed', i === selected ? 'true' : 'false');
        });
    }

    function choose(index: number): void {
        var next = index === selected || index < 0 || index >= slices.length || !(shares[index] > 0) ? -1 : index;
        if (next === selected) return;
        selected = next;
        paintSelection();
        if (typeof opts.onSelect === 'function') opts.onSelect(selected >= 0 ? copy([slices[selected]])[0] : null, selected);
    }

    function drawLegend(legend: HTMLElement): void {
        runAll(legendCleanups);
        keys = [];
        legend.setAttribute('class', 'base-chart-legend base-pie-chart-legend');
        slices.forEach(function (s, i) {
            var key = make('button', 'base-pie-chart-key', { type: 'button', 'aria-pressed': 'false', 'aria-label': nameOf(i) }) as HTMLButtonElement;
            var swatch = make('span', 'base-chart-swatch', { 'aria-hidden': 'true' });
            applyColor(swatch, colorOf(i));
            key.appendChild(swatch);
            key.appendChild(make('span', 'base-pie-chart-key-label', { title: s.label }, s.label));
            key.appendChild(make('span', 'base-pie-chart-key-value', null, format(valueOf(i))));
            key.appendChild(make('span', 'base-pie-chart-key-share', null, percentText(shares[i])));
            // A slice with no share draws nothing, so its row reports the 0% but has nothing to select.
            if (!(shares[i] > 0)) key.disabled = true;
            legendCleanups.push(listen(key, 'click', function () { choose(i); }));
            legend.appendChild(key);
            keys.push(key);
        });
        paintSelection();
    }

    function draw(frame: ChartFrame): void {
        marks = [];
        var r = frame.width / 2 - 1;
        var c = frame.width / 2;
        var inner = opts.donut ? r * DONUT_HOLE : 0;
        pieAngles(slices.map(function (s, i) { return valueOf(i); })).forEach(function (a, i) {
            if (!(a.share > 0)) return;
            var path = svgEl('path', { d: slicePath(c, c, r, inner, a.start, a.end) });
            frame.paint(path, colorOf(i));
            path.setAttribute('class', 'base-pie-chart-slice ' + path.getAttribute('class'));
            frame.mark(path, 0, i);
            path.setAttribute('aria-label', nameOf(i));
            if (opts.donut) path.setAttribute('fill-rule', 'evenodd');
            frame.svg.appendChild(path);
            marks.push(path);
        });
        if (opts.donut) drawCenter(frame, c, inner);
        paintSelection();
    }

    // The center of a donut holds a value over a small label, each shortened with an ellipsis to fit the hole, its full text kept as a tooltip.
    function drawCenter(frame: ChartFrame, c: number, inner: number): void {
        var big = toText(opts.centerText);
        var small = toText(opts.centerLabel);
        var room = inner * 1.6;
        var lines: Array<[string, string, number]> = [];
        if (big) lines.push([big, 'base-pie-chart-center', frame.font * 1.34]);
        if (small) lines.push([small, 'base-pie-chart-center-label', frame.font]);
        var y = c - (lines.length - 1) * frame.font * 0.8;
        lines.forEach(function (line) {
            var fits = Math.max(3, Math.floor(room / (line[2] * 0.58)));
            var shown = line[0].length > fits ? line[0].slice(0, fits - 1) + '…' : line[0];
            var node = frame.text(c, y + line[2] * 0.35, shown, 'middle', line[1]);
            if (shown !== line[0]) { var title = svgEl('title', {}); title.textContent = line[0]; node.appendChild(title); }
            frame.svg.appendChild(node);
            y += frame.font * 1.6;
        });
    }

    function data(): { labels: string[]; series: Array<{ name: string; values: number[] }> } {
        shares = pieShares(slices.map(function (s) { return s.value; }));
        if (selected >= slices.length || (selected >= 0 && !(shares[selected] > 0))) selected = -1;
        return { labels: slices.map(function (s) { return s.label; }), series: [{ name: opts.valueName || baseText('LabelValue'), values: slices.map(function (s, i) { return valueOf(i); }) }] };
    }

    var first = data();
    chart = buildChart({ label: opts.label, labels: first.labels, series: first.series, unit: opts.unit, format: opts.format, emptyText: opts.emptyText }, {
        className: 'base-pie-chart' + (opts.donut ? ' donut' : '') + (opts.size === 'small' || opts.size === 'large' ? ' ' + opts.size : ''),
        radial: true,
        emptyText: baseText('Base.NothingToShow'),
        draw: draw,
        detail: function (seriesIndex: number, labelIndex: number): string { return percentText(shares[labelIndex]); },
        select: function (seriesIndex: number, labelIndex: number): void { choose(labelIndex); },
        legend: opts.showLegend === false ? undefined : drawLegend,
        hasData: function (): boolean { return shares.some(function (s) { return s > 0; }); }
    });
    var root = chart.element;
    paintSelection();

    // The legend sits beside the pie while the chart is wide enough for both, and under it when it is not.
    function fit(): void {
        var width = root.clientWidth || 0;
        root.classList.toggle('compact', !!width && width < COMPACT_WIDTH);
    }
    if (typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(fit);
        watch.observe(root);
        cleanups.push(function () { watch.disconnect(); });
    }
    var tick = setTimeout(fit, 0);
    cleanups.push(function () { clearTimeout(tick); });

    function setSlices(next: PieSlice[] | null): void {
        slices = copy(next);
        chart!.setValue(data());
    }

    return {
        element: root,
        getValue: function () { return copy(slices); },
        setValue: setSlices,
        setSlices: setSlices,
        getSelected: function () { return selected; },
        select: function (index: number | null): void {
            if (index === null || index < 0) { if (selected >= 0) choose(selected); return; }
            if (index !== selected) choose(index);
        },
        redraw: function () { chart!.redraw(); },
        destroy: function () { runAll(legendCleanups); runAll(cleanups); chart!.destroy(); }
    };
}
