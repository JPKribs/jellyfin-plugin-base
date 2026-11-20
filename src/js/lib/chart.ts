// chart.ts
// The core every chart shares: the frame, the scale, the axes, the legend, the tooltip, the empty state, and the hidden table of numbers. The bar chart, the line chart, the pie chart, and the sparkline each draw only their marks on it. None of it is exported from the bundle.

import { make, clear, listen, runAll, toText, nextId, fill } from './dom.js';
import { applyColor, colorClass } from './color.js';
import { anchorPopover } from './popover.js';
import { baseText } from './base-text.js';

/** One series of a chart: a name for the legend and the table, a status color name or a hex code, and one value per label. */
export interface ChartSeries {
    name?: string;
    color?: string;
    values: Array<number | null | undefined>;
}

/** What every chart takes. A variation adds its own options to these. */
export interface ChartOptions {
    labels?: string[];
    series?: ChartSeries[];
    label?: string;
    height?: number;
    unit?: string;
    min?: number;
    max?: number;
    ticks?: number;
    valueLabels?: boolean;
    emptyText?: string;
    format?(value: number): string;
}

/** What a chart returns. setValue takes new labels and series and draws again. */
export interface ChartHandle {
    element: HTMLElement;
    getValue(): { labels: string[]; series: ChartSeries[] };
    setValue(next: { labels?: string[]; series?: ChartSeries[] } | null): void;
    redraw(): void;
    destroy(): void;
}

/** The plot area and the scale a variation draws its marks with. */
export interface ChartFrame {
    svg: SVGSVGElement;
    width: number;
    height: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
    font: number;
    labels: string[];
    series: ChartSeries[];
    y(value: number): number;
    band(index: number): { start: number; size: number; middle: number };
    group(index: number): SVGGElement;
    mark(el: SVGElement, seriesIndex: number, labelIndex: number): void;
    paint(el: SVGElement, color: string): void;
    text(x: number, y: number, value: string, anchor: string, className: string): SVGTextElement;
    format(value: number): string;
}

/**
 * What buildChart takes beside the chart options: the class of the variation and the function that draws its marks.
 * radial drops the axes and draws a square plot as wide as the CSS makes it. detail adds text after a mark's value, such as its share.
 * select makes each mark a button that a click, Enter, or Space reports. legend draws the legend in place of the series legend.
 * emptyText is the variation's default empty sentence, and hasData decides when there is something to draw.
 */
export interface ChartCore {
    className: string;
    points?: boolean;
    radial?: boolean;
    emptyText?: string;
    draw(frame: ChartFrame): void;
    detail?(seriesIndex: number, labelIndex: number): string;
    select?(seriesIndex: number, labelIndex: number): void;
    legend?(legend: HTMLElement): void;
    hasData?(series: ChartSeries[]): boolean;
}

var SVG_NS: string = 'http://www.w3.org/2000/svg';
// The status colors a series takes in turn when it names none, so neighbors never share one.
export var SERIES_COLORS: string[] = ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'pink', 'yellow'];

/**
 * Makes an SVG element with attributes.
 * Internal to the charts.
 */
export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Record<string, unknown> | null): SVGElementTagNameMap[K] {
    var el = document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
}

/**
 * Picks a few round tick values that cover a range, such as 0, 25, 50, 75, 100.
 *
 * @param min the lowest value
 * @param max the highest value
 * @param count about how many ticks (default 4)
 * @returns the ticks, from low to high, the first at or below min and the last at or above max
 */
export function niceTicks(min: number, max: number, count?: number): number[] {
    var want = count && count > 1 ? count : 4;
    if (!isFinite(min) || !isFinite(max)) return [0, 1];
    if (min === max) { if (min === 0) return [0, 1]; min = Math.min(0, min); max = Math.max(0, max); }
    var raw = (max - min) / want;
    var power = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * power; }).filter(function (s) { return s >= raw; })[0] || 10 * power;
    var start = Math.floor(min / step) * step;
    var end = Math.ceil(max / step) * step;
    var ticks: number[] = [];
    for (var v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v / step) * step === 0 ? 0 : parseFloat(v.toPrecision(12)));
    return ticks;
}

/**
 * Writes a number short, such as 950, 1.2k, 3.4M, or 0.25, so an axis stays narrow.
 *
 * @param value the number
 * @returns the text
 */
export function shortNumber(value: number): string {
    var a = Math.abs(value);
    if (a >= 1e9) return parseFloat((value / 1e9).toFixed(1)) + 'B';
    if (a >= 1e6) return parseFloat((value / 1e6).toFixed(1)) + 'M';
    if (a >= 1e4) return parseFloat((value / 1e3).toFixed(1)) + 'k';
    return String(parseFloat(value.toFixed(2)));
}

/**
 * The text of one value: the chart's format function when it has one, else the short number and the unit.
 * Internal to the charts.
 */
export function formatValue(options: ChartOptions, value: number): string {
    if (typeof options.format === 'function') return options.format(value);
    return shortNumber(value) + (options.unit ? ' ' + options.unit : '');
}

/**
 * The status color a series draws in: its own color, else the next one in SERIES_COLORS.
 * Internal to the charts.
 */
export function seriesColor(series: ChartSeries, index: number): string {
    return colorClass(series.color) ? series.color! : SERIES_COLORS[index % SERIES_COLORS.length];
}

// Reads a token as pixels where the element sits, with a fallback.
function tokenPx(el: Element, name: string, fallback: number): number {
    var raw = '';
    try { raw = window.getComputedStyle(el).getPropertyValue(name); } catch (e) { raw = ''; }
    var px = parseFloat(raw);
    return isNaN(px) ? fallback : px;
}

/**
 * Builds a chart on the shared core: an SVG drawn at its own pixel width, so text never scales, that draws again when its width changes, y gridlines with a few round ticks,
 * x labels that thin out when crowded, a legend only with several series, a tooltip on hover and focus of each mark, and a visually hidden table of every number.
 * Internal to the charts.
 *
 * @param options the chart options
 * @param core { className, points: true puts labels on points rather than bands, draw(frame) that draws the marks }
 * @returns { element, getValue, setValue, redraw, destroy }.
 */
export function buildChart(options: ChartOptions, core: ChartCore): ChartHandle {
    var labels: string[] = (options.labels || []).slice();
    var series: ChartSeries[] = (options.series || []).slice();
    var cleanups: Array<() => void> = [];
    var drawCleanups: Array<() => void> = [];
    var lastWidth = -1;

    var root = make('figure', 'base-chart ' + core.className);
    var titleId = nextId('chart');
    if (options.label) {
        root.appendChild(make('figcaption', 'base-sr-only', { id: titleId }, options.label));
        root.setAttribute('aria-labelledby', titleId);
    }
    var plot = make('div', 'base-chart-plot');
    var empty = make('div', 'base-list-empty base-chart-empty');
    empty.hidden = true;
    var legend = make('div', 'base-chart-legend');
    var table = make('table', 'base-sr-only');
    var tip = make('div', 'base-tooltip base-chart-tip', { role: 'tooltip' });
    tip.hidden = true;
    root.appendChild(plot);
    root.appendChild(empty);
    root.appendChild(legend);
    root.appendChild(table);
    root.appendChild(tip);

    function format(value: number): string { return formatValue(options, value); }

    // Several marks of one value read as one line, such as 820 GB, 41%.
    function valueText(seriesIndex: number, labelIndex: number): string {
        var v = series[seriesIndex].values[labelIndex];
        if (typeof v !== 'number' || !isFinite(v)) return '';
        var extra = core.detail ? core.detail(seriesIndex, labelIndex) : '';
        return format(v) + (extra ? ', ' + extra : '');
    }

    function hasData(): boolean {
        if (core.hasData) return core.hasData(series);
        return series.some(function (s) { return s.values.some(function (v) { return typeof v === 'number' && isFinite(v); }); });
    }

    // The empty sentence stands in for the plot and the legend when there is nothing to draw and the chart has one.
    function drawEmpty(): boolean {
        var text = typeof options.emptyText === 'string' ? options.emptyText : (core.emptyText || '');
        var none = !!text && !hasData();
        empty.textContent = none ? text : '';
        empty.hidden = !none;
        plot.hidden = none;
        return none;
    }

    function drawLegend(): void {
        clear(legend);
        if (core.legend && plot.hidden) { legend.hidden = true; return; }
        if (core.legend) { legend.hidden = false; core.legend(legend); return; }
        legend.hidden = series.length < 2;
        if (legend.hidden) return;
        series.forEach(function (s, i) {
            var item = make('span', 'base-chart-key');
            var swatch = make('span', 'base-chart-swatch', { 'aria-hidden': 'true' });
            applyColor(swatch, seriesColor(s, i));
            item.appendChild(swatch);
            item.appendChild(make('span', null, null, s.name || ''));
            legend.appendChild(item);
        });
    }

    function drawTable(): void {
        clear(table);
        if (options.label) table.appendChild(make('caption', null, null, options.label));
        var head = make('tr');
        head.appendChild(make('th', null, { scope: 'col' }, ''));
        series.forEach(function (s, i) { head.appendChild(make('th', null, { scope: 'col' }, s.name || fill(baseText('Base.SeriesNumber'), i + 1))); });
        var thead = make('thead');
        thead.appendChild(head);
        table.appendChild(thead);
        var body = make('tbody');
        labels.forEach(function (label, li) {
            var tr = make('tr');
            tr.appendChild(make('th', null, { scope: 'row' }, label));
            series.forEach(function (s, si) {
                tr.appendChild(make('td', null, null, valueText(si, li)));
            });
            body.appendChild(tr);
        });
        table.appendChild(body);
    }

    var popover = anchorPopover(root, tip, { align: 'center', prefer: 'above', follow: 'hide', returnFocus: false });
    cleanups.push(function () { popover.destroy(); });

    function showTip(el: SVGElement, seriesIndex: number, labelIndex: number): void {
        var s = series[seriesIndex];
        var v = s.values[labelIndex];
        clear(tip);
        tip.appendChild(make('div', 'base-chart-tip-label', null, labels[labelIndex] || ''));
        var line = make('div', 'base-chart-tip-value');
        if (series.length > 1) {
            var swatch = make('span', 'base-chart-swatch', { 'aria-hidden': 'true' });
            applyColor(swatch, seriesColor(s, seriesIndex));
            line.appendChild(swatch);
            line.appendChild(make('span', null, null, (s.name || '') + ' '));
        }
        line.appendChild(make('strong', null, null, typeof v === 'number' ? format(v) : ''));
        var extra = core.detail && typeof v === 'number' ? core.detail(seriesIndex, labelIndex) : '';
        if (extra) line.appendChild(make('span', 'base-chart-tip-detail', null, extra));
        tip.appendChild(line);
        popover.open();
        placeOn(el);
    }

    // The tip moves onto the mark itself, so it opens above the bar or the point rather than the whole chart.
    function placeOn(el: Element): void {
        var box = el.getBoundingClientRect();
        var size = tip.getBoundingClientRect();
        var left = box.left + box.width / 2 - size.width / 2;
        var top = box.top - size.height - 8;
        if (top < 8) top = box.bottom + 8;
        left = Math.max(8, Math.min(left, (window.innerWidth || 1024) - size.width - 8));
        tip.style.left = left + 'px';
        tip.style.top = top + 'px';
    }

    function hideTip(): void { popover.close(); }

    function draw(): void {
        runAll(drawCleanups);
        hideTip();
        clear(plot);
        if (plot.hidden) return;
        var width = Math.floor(plot.clientWidth || root.clientWidth || 0) || 320;
        lastWidth = width;
        var height = core.radial ? width : (options.height && options.height > 0 ? options.height : 200);
        var font = tokenPx(root, '--base-font-small', 12);
        var gap = tokenPx(root, '--base-gap-narrow', 8);
        var values: number[] = [];
        series.forEach(function (s) { s.values.forEach(function (v) { if (typeof v === 'number' && isFinite(v)) values.push(v); }); });
        var low = typeof options.min === 'number' ? options.min : Math.min(0, values.length ? Math.min.apply(null, values) : 0);
        var high = typeof options.max === 'number' ? options.max : (values.length ? Math.max.apply(null, values) : 1);
        var ticks = niceTicks(low, high, options.ticks || 4);
        var y0 = typeof options.min === 'number' ? options.min : ticks[0];
        var y1 = typeof options.max === 'number' ? options.max : ticks[ticks.length - 1];
        if (y1 === y0) y1 = y0 + 1;
        var tickText = ticks.filter(function (t) { return t >= y0 && t <= y1; }).map(format);
        // The y axis is as wide as its longest tick, at about six tenths of the font size per character.
        var axis = Math.ceil(Math.max.apply(null, tickText.map(function (t) { return t.length; }).concat([1])) * font * 0.62) + gap;
        var top = core.radial ? 0 : Math.ceil(font * (options.valueLabels === false ? 0.75 : 1.75));
        var bottom = core.radial ? height : height - Math.ceil(font * 1.5 + gap);
        var left = core.radial ? 0 : axis;
        var right = core.radial ? width : width - (core.points ? gap * 2 : gap / 2);
        var count = Math.max(labels.length, 1);

        // A radial chart's marks are buttons a screen reader can reach, so its SVG stays in the accessibility tree.
        var svg = svgEl('svg', core.radial ? { width: width, height: height, viewBox: '0 0 ' + width + ' ' + height, focusable: 'false' }
            : { width: width, height: height, viewBox: '0 0 ' + width + ' ' + height, 'aria-hidden': 'true', focusable: 'false' });
        var grid = svgEl('g', { class: 'base-chart-grid' });
        svg.appendChild(grid);
        var marks = svgEl('g', { class: 'base-chart-marks' });

        function y(value: number): number {
            return bottom - (value - y0) / (y1 - y0) * (bottom - top);
        }
        function band(index: number): { start: number; size: number; middle: number } {
            if (core.points) {
                var step = count > 1 ? (right - left - gap) / (count - 1) : 0;
                var x = left + gap / 2 + step * index + (count > 1 ? 0 : (right - left) / 2);
                return { start: x, size: 0, middle: x };
            }
            var size = (right - left) / count;
            return { start: left + size * index, size: size, middle: left + size * index + size / 2 };
        }
        // SVG elements carry the color class, and a hex color its custom property, as every colored component does.
        function paint(el: SVGElement, color: string): void {
            el.setAttribute('class', 'base-chart-series ' + colorClass(color));
            if (colorClass(color) === 'custom') el.setAttribute('style', '--base-custom: ' + color.trim());
        }
        function text(x: number, yy: number, value: string, anchor: string, className: string): SVGTextElement {
            var t = svgEl('text', { x: x, y: yy, 'text-anchor': anchor, class: className });
            t.textContent = value;
            return t;
        }

        ticks.forEach(function (t) {
            if (core.radial || t < y0 || t > y1) return;
            var yy = Math.round(y(t)) + 0.5;
            grid.appendChild(svgEl('line', { x1: left, x2: right, y1: yy, y2: yy, class: t === 0 ? 'base-chart-zero' : '' }));
            grid.appendChild(text(left - gap / 2, yy + font * 0.35, format(t), 'end', 'base-chart-tick'));
        });

        // Points along a line, such as hours, thin out to every second or later label so none overlaps the next. Bars are
        // categories, so every bar keeps its label, shortened with an ellipsis when it does not fit its band.
        var charWidth = font * 0.58;
        var longest = Math.max.apply(null, labels.map(function (l) { return toText(l).length; }).concat([1])) * charWidth + gap;
        var room = count > 1 ? (core.points ? (right - left) / (count - 1) : (right - left) / count) : right - left;
        var every = core.points ? Math.max(1, Math.ceil(longest / Math.max(room, 1))) : 1;
        var fits = Math.max(3, Math.floor((room - gap / 2) / charWidth));
        labels.forEach(function (l, i) {
            if (core.radial || i % every !== 0) return;
            var b = band(i);
            var anchor = 'middle';
            if (core.points && i === 0) anchor = 'start';
            else if (core.points && i === count - 1) anchor = 'end';
            var label = toText(l);
            var shown = !core.points && label.length > fits ? label.slice(0, fits - 1) + '\u2026' : label;
            var node = text(b.middle, height - gap / 2, shown, anchor, 'base-chart-label');
            // A shortened label keeps its full text as a tooltip.
            if (shown !== label) { var title = svgEl('title', {}); title.textContent = label; node.appendChild(title); }
            grid.appendChild(node);
        });

        var groups: SVGGElement[] = [];
        var frame: ChartFrame = {
            svg: svg, width: width, height: height, left: left, right: right, top: top, bottom: bottom, font: font,
            labels: labels, series: series, y: y, band: band, text: text, format: format,
            group: function (index: number): SVGGElement {
                if (groups[index]) return groups[index];
                var g = svgEl('g', { class: 'base-chart-series' });
                paint(g, seriesColor(series[index], index));
                marks.appendChild(g);
                groups[index] = g;
                return g;
            },
            paint: paint,
            mark: function (el: SVGElement, seriesIndex: number, labelIndex: number): void {
                var v = series[seriesIndex].values[labelIndex];
                el.setAttribute('class', (el.getAttribute('class') || '') + ' base-chart-mark');
                el.setAttribute('tabindex', '-1');
                el.setAttribute('data-label', String(labelIndex));
                el.setAttribute('data-series', String(seriesIndex));
                drawCleanups.push(listen(el, 'mouseenter', function () { showTip(el, seriesIndex, labelIndex); }));
                drawCleanups.push(listen(el, 'mouseleave', hideTip));
                drawCleanups.push(listen(el, 'focus', function () { showTip(el, seriesIndex, labelIndex); }));
                drawCleanups.push(listen(el, 'blur', hideTip));
                el.setAttribute('aria-label', (labels[labelIndex] || '') + ', ' + (series[seriesIndex].name ? series[seriesIndex].name + ', ' : '') + (typeof v === 'number' ? valueText(seriesIndex, labelIndex) : ''));
                if (core.select) {
                    el.setAttribute('role', 'button');
                    drawCleanups.push(listen(el, 'click', function () { core.select!(seriesIndex, labelIndex); }));
                }
            }
        };
        svg.appendChild(marks);
        core.draw(frame);
        plot.appendChild(svg);
    }

    // The marks take focus one at a time with the arrow keys from the plot, so a keyboard reaches every tooltip without a tab stop per mark.
    plot.setAttribute('tabindex', '0');
    if (options.label) plot.setAttribute('aria-label', options.label);
    var active = -1;
    cleanups.push(listen(plot, 'keydown', function (e: KeyboardEvent) {
        var all = Array.prototype.slice.call(plot.querySelectorAll('.base-chart-mark')) as SVGElement[];
        if (!all.length) return;
        var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0);
        if (e.key === 'Escape') { hideTip(); return; }
        if (core.select && (e.key === 'Enter' || e.key === ' ') && active >= 0 && all[active]) {
            e.preventDefault();
            core.select(parseInt(all[active].getAttribute('data-series') || '0', 10), parseInt(all[active].getAttribute('data-label') || '0', 10));
            return;
        }
        if (!step) return;
        e.preventDefault();
        active = Math.max(0, Math.min(all.length - 1, active + step));
        var el = all[active];
        showTip(el, parseInt(el.getAttribute('data-series') || '0', 10), parseInt(el.getAttribute('data-label') || '0', 10));
    }));
    cleanups.push(listen(plot, 'blur', function () { active = -1; hideTip(); }));

    function redraw(): void {
        drawEmpty();
        drawLegend();
        drawTable();
        draw();
    }

    if (typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(function () {
            var width = Math.floor(plot.clientWidth || 0);
            if (width && width !== lastWidth) draw();
        });
        watch.observe(plot);
        cleanups.push(function () { watch.disconnect(); });
    }
    // A chart placed right after it is built draws at its real width once it is in the page.
    var first = setTimeout(function () {
        var width = Math.floor(plot.clientWidth || 0);
        if (width && width !== lastWidth) draw();
    }, 0);
    cleanups.push(function () { clearTimeout(first); });

    redraw();

    return {
        element: root,
        getValue: function () { return { labels: labels.slice(), series: series.map(function (s) { return { name: s.name, color: s.color, values: s.values.slice() }; }) }; },
        setValue: function (next) {
            next = next || {};
            if (next.labels) labels = next.labels.slice();
            if (next.series) series = next.series.slice();
            redraw();
        },
        redraw: redraw,
        destroy: function () { runAll(drawCleanups); runAll(cleanups); }
    };
}
