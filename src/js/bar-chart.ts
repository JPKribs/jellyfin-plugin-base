import { buildChart } from './lib/chart.js';
import type { ChartOptions, ChartHandle, ChartFrame } from './lib/chart.js';
import { svgEl } from './lib/chart.js';

export type { ChartSeries } from './lib/chart.js';

/** What createBarChart takes. Each label is one group of bars, one bar per series. */
export interface BarChartOptions extends ChartOptions {
    valueLabels?: boolean;
}

/** What createBarChart returns. getValue returns the labels and series, and setValue draws new ones. */
export interface BarChartHandle extends ChartHandle {
    destroy(): void;
}

/**
 * A bar chart on the shared chart core, drawn as inline SVG at its own width. Each label is a group with one bar per series, in the series' color, with its value above it when there is room.
 * It draws again when its width changes, shows a tooltip on hover and focus, adds a legend only with several series, and keeps a visually hidden table of every number.
 *
 * @param options {
 *   labels      : the label under each group of bars [optional]
 *   series      : [{ name, color, values }] where color is a status color name or a hex code (default the series colors in turn) [optional]
 *   label       : the chart's accessible name and the hidden table's caption [optional]
 *   height      : height in pixels (default 200)
 *   unit        : text after each value, such as 'GB' [optional]
 *   min         : lowest value of the axis (default 0, or the lowest value below it)
 *   max         : highest value of the axis (default a round number above the highest value)
 *   ticks       : about how many gridlines (default 4)
 *   valueLabels : false hides the value above each bar (default true)
 *   format      : function(value) returning the text of a value, which wins over unit [optional]
 * }
 * @returns { element, getValue, setValue, redraw, destroy }. setValue takes { labels, series } and draws again.
 */
export function createBarChart(options?: BarChartOptions): BarChartHandle {
    var opts = options || {};
    return buildChart(opts, {
        className: 'base-bar-chart',
        draw: function (frame: ChartFrame): void {
            var count = frame.series.length || 1;
            // Bars grow from zero, or from the axis edge when zero is out of range.
            var zero = Math.min(Math.max(frame.y(0), frame.top), frame.bottom);
            frame.labels.forEach(function (label, li) {
                var b = frame.band(li);
                var inner = b.size * 0.72;
                var width = Math.max(1, inner / count - (count > 1 ? 2 : 0));
                frame.series.forEach(function (s, si) {
                    var v = s.values[li];
                    if (typeof v !== 'number' || !isFinite(v)) return;
                    var x = b.start + (b.size - inner) / 2 + si * (inner / count) + (count > 1 ? 1 : 0);
                    var yv = frame.y(v);
                    var top = Math.min(yv, zero);
                    var rect = svgEl('rect', { x: x, y: top, width: width, height: Math.max(1, Math.abs(zero - yv)), rx: Math.min(3, width / 4) });
                    frame.mark(rect, si, li);
                    frame.group(si).appendChild(rect);
                    var text = frame.format(v);
                    // A value sits above its bar only when it fits the bar's width.
                    if (opts.valueLabels !== false && text.length * frame.font * 0.62 <= width + frame.font) {
                        frame.group(si).appendChild(frame.text(x + width / 2, top - frame.font * 0.4, text, 'middle', 'base-chart-value'));
                    }
                });
            });
        }
    }) as BarChartHandle;
}
