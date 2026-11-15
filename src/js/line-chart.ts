import { buildChart, svgEl } from './lib/chart.js';
import type { ChartOptions, ChartHandle, ChartFrame } from './lib/chart.js';

/** What createLineChart takes. Each label is one point along the x axis, and each series one line. */
export interface LineChartOptions extends ChartOptions {
    area?: boolean;
    dots?: boolean;
}

/** What createLineChart returns. getValue returns the labels and series, and setValue draws new ones. */
export interface LineChartHandle extends ChartHandle {
    destroy(): void;
}

/**
 * A line chart on the shared chart core, drawn as inline SVG at its own width. Each series is a line through one point per label, in the series' color, and a missing value breaks the line.
 * It draws again when its width changes, shows a tooltip on hover and focus of each point, adds a legend only with several series, and keeps a visually hidden table of every number.
 *
 * @param options {
 *   labels      : the label of each point along the x axis [optional]
 *   series      : [{ name, color, values }] where color is a status color name or a hex code (default the series colors in turn) [optional]
 *   label       : the chart's accessible name and the hidden table's caption [optional]
 *   height      : height in pixels (default 200)
 *   unit        : text after each value, such as 'ms' [optional]
 *   min         : lowest value of the axis (default 0, or the lowest value below it)
 *   max         : highest value of the axis (default a round number above the highest value)
 *   ticks       : about how many gridlines (default 4)
 *   area        : true shades the area under each line (default false)
 *   dots        : false draws the points only on hover and focus (default true)
 *   format      : function(value) returning the text of a value, which wins over unit [optional]
 * }
 * @returns { element, getValue, setValue, redraw, destroy }. setValue takes { labels, series } and draws again.
 */
export function createLineChart(options?: LineChartOptions): LineChartHandle {
    var opts = options || {};
    var chart = buildChart(Object.assign({ valueLabels: false }, opts), {
        className: 'base-line-chart' + (opts.dots === false ? ' quiet' : ''),
        points: true,
        draw: function (frame: ChartFrame): void {
            var zero = Math.min(Math.max(frame.y(0), frame.top), frame.bottom);
            frame.series.forEach(function (s, si) {
                var g = frame.group(si);
                var runs: Array<Array<[number, number]>> = [[]];
                frame.labels.forEach(function (label, li) {
                    var v = s.values[li];
                    if (typeof v !== 'number' || !isFinite(v)) { runs.push([]); return; }
                    runs[runs.length - 1].push([frame.band(li).middle, frame.y(v)]);
                });
                runs.forEach(function (run) {
                    if (!run.length) return;
                    var d = run.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
                    if (opts.area && run.length > 1) {
                        g.appendChild(svgEl('path', { d: d + ' L' + run[run.length - 1][0].toFixed(1) + ' ' + zero + ' L' + run[0][0].toFixed(1) + ' ' + zero + ' Z', class: 'base-chart-area' }));
                    }
                    g.appendChild(svgEl('path', { d: d, class: 'base-chart-line' }));
                });
                frame.labels.forEach(function (label, li) {
                    var v = s.values[li];
                    if (typeof v !== 'number' || !isFinite(v)) return;
                    var dot = svgEl('circle', { cx: frame.band(li).middle, cy: frame.y(v), r: 3.5, class: 'base-chart-dot' });
                    frame.mark(dot, si, li);
                    g.appendChild(dot);
                });
            });
        }
    });
    return chart as LineChartHandle;
}
