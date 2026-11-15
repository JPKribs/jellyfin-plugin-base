import { make, fillAll } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import { svgEl, shortNumber } from './lib/chart.js';
import type { ComponentHandle } from './types.js';

/** What createSparkline takes. values are drawn left to right as one small line with no axes. */
export interface SparklineOptions {
    values?: Array<number | null | undefined>;
    color?: string;
    label?: string;
    unit?: string;
    area?: boolean;
    summaryText?: string;
    format?(value: number): string;
}

/** What createSparkline returns. getValue returns the values, and setValue draws new ones. */
export interface SparklineHandle extends ComponentHandle {
    getValue(): number[];
    setValue(values: Array<number | null | undefined> | null): void;
    destroy(): void;
}

/**
 * A small line with no axes that shows the shape of a series, such as beside a number on a stat card. It fills the width it is given and is one line of text tall.
 * It is an image whose name gives the first, last, lowest, and highest values, so a screen reader hears the numbers the shape shows.
 *
 * @param options {
 *   values      : the numbers, left to right, where a missing value is skipped [optional]
 *   color       : status color name or hex code of the line (default the accent)
 *   label       : what the values are, the start of the accessible name (default 'Trend')
 *   unit        : text after each number in the name, such as 'GB' [optional]
 *   area        : true shades the area under the line (default true)
 *   summaryText : the name after the label, where {first}, {last}, {low}, and {high} are the values (default 'from {first} to {last}, low {low}, high {high}')
 *   format      : function(value) returning the text of a value, which wins over unit [optional]
 * }
 * @returns { element, getValue, setValue, destroy }.
 */
export function createSparkline(options?: SparklineOptions): SparklineHandle {
    var opts = options || {};
    var values: Array<number | null | undefined> = [];
    var root = make('span', 'base-sparkline', { role: 'img' });
    applyColor(root, opts.color);

    function text(v: number): string {
        if (typeof opts.format === 'function') return opts.format(v);
        return shortNumber(v) + (opts.unit ? ' ' + opts.unit : '');
    }

    function draw(): void {
        root.innerHTML = '';
        var nums = values.filter(function (v): v is number { return typeof v === 'number' && isFinite(v); });
        var label = opts.label || 'Trend';
        if (!nums.length) {
            root.setAttribute('aria-label', label);
            return;
        }
        var low = Math.min.apply(null, nums);
        var high = Math.max.apply(null, nums);
        var span = high - low || 1;
        var w = 100;
        var h = 24;
        var step = values.length > 1 ? w / (values.length - 1) : 0;
        var points: string[] = [];
        values.forEach(function (v, i) {
            if (typeof v !== 'number' || !isFinite(v)) return;
            points.push((values.length > 1 ? i * step : w / 2).toFixed(2) + ' ' + (h - 2 - (v - low) / span * (h - 4)).toFixed(2));
        });
        // The line stretches to any width, and its stroke keeps its thickness through non-scaling-stroke.
        var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
        var d = 'M' + points.join(' L');
        if (opts.area !== false && points.length > 1) {
            var first = points[0].split(' ')[0];
            var last = points[points.length - 1].split(' ')[0];
            svg.appendChild(svgEl('path', { d: d + ' L' + last + ' ' + h + ' L' + first + ' ' + h + ' Z', class: 'base-sparkline-area' }));
        }
        svg.appendChild(svgEl('path', { d: d, class: 'base-sparkline-line' }));
        root.appendChild(svg);
        var summary = fillAll(opts.summaryText || 'from {first} to {last}, low {low}, high {high}', { first: text(nums[0]), last: text(nums[nums.length - 1]), low: text(low), high: text(high) });
        root.setAttribute('aria-label', label + ', ' + summary);
    }

    function setValue(next: Array<number | null | undefined> | null): void {
        values = (next || []).slice();
        draw();
    }

    setValue(opts.values || []);
    return {
        element: root,
        getValue: function () { return values.filter(function (v): v is number { return typeof v === 'number' && isFinite(v); }); },
        setValue: setValue,
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
