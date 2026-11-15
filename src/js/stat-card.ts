import { make, icon, toText } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import { buildCard } from './lib/card.js';
import { createSparkline } from './sparkline.js';
import type { SparklineHandle } from './sparkline.js';
import type { ComponentHandle } from './types.js';

/** What createStatCard takes, and what its getValue returns as drawn. */
export interface StatCardOptions {
    value?: unknown;
    label?: string;
    color?: string;
    trend?: number;
    trendSuffix?: string;
    trendLabel?: string;
    positiveIsGood?: boolean;
    trendUpText?: string;
    trendDownText?: string;
    trendFlatText?: string;
    sparkline?: Array<number | null | undefined> | null;
    sparklineColor?: string;
    detail?: string | string[];
    layout?: 'value-top' | 'label-top';
    valueColor?: string;
}

/** What createStatCard returns. setValue merges the given options into the ones drawn. */
export interface StatCardHandle extends ComponentHandle {
    getValue(): StatCardOptions;
    setValue(next: StatCardOptions): void;
    destroy(): void;
}

/**
 * A status card with a number or a short text status, a label, and an optional trend and detail lines. The trend is a number with an arrow, green when the change is good and red when it is bad, and gray at zero.
 *
 * @param options {
 *   value         : the number or text shown large, such as 1204 or 'Delivered 3m ago'. Text wraps and is never shrunk [optional]
 *   label         : text under the value, or above it with layout 'label-top' [optional]
 *   color         : card color name such as 'blue' or 'green', as the base-card modifiers [optional]
 *   trend         : change as a number, where 12 is up 12 and -3 is down 3 [optional]
 *   trendSuffix   : text after the trend number, such as '%' [optional]
 *   trendLabel    : text after the trend, such as 'vs last week' [optional]
 *   positiveIsGood: false makes an increase red and a decrease green (default true)
 *   trendUpText   : hidden text for an increase (default 'Up')
 *   trendDownText : hidden text for a decrease (default 'Down')
 *   trendFlatText : hidden text for no change (default 'No change')
 *   sparkline     : numbers drawn as a small line under the trend, through createSparkline, named by the label [optional]
 *   sparklineColor: status color name or hex code of the line (default the card's text color)
 *   detail        : one or two dimmed lines under the value and label, each ending in an ellipsis with the full text as its tooltip [optional]
 *   layout        : 'value-top' (default) puts the value over the label, and 'label-top' puts the small label first, then the value, then the details
 *   valueColor    : status color name or hex code of the value text, such as 'orange' for a paused state (default the card's text color)
 * }
 * @returns { element, getValue, setValue, destroy }. getValue returns the options as drawn, and setValue takes the same shape.
 * The trend arrow carries hidden text so a screen reader hears the direction.
 */
export function createStatCard(options?: StatCardOptions): StatCardHandle {
    options = options || {};
    // A stat card is the shared count card with a trend line added under its label.
    var card = buildCard({ className: 'base-stat' });
    var root = card.element;
    var valueEl = card.count;
    var labelEl = card.label;
    var trendEl = make('span', 'base-stat-trend base-icon-text small');
    root.appendChild(trendEl);
    var detailEls: HTMLElement[] = [];
    var state: StatCardOptions = {};
    var spark: SparklineHandle | null = null;

    function drawSparkline(next: StatCardOptions): void {
        if (spark) { spark.destroy(); spark = null; }
        if (!next.sparkline || !next.sparkline.length) return;
        spark = createSparkline({ values: next.sparkline, color: next.sparklineColor, label: next.label || undefined });
        spark.element.classList.add('base-stat-sparkline');
        root.appendChild(spark.element);
    }

    // Draws up to two detail lines after the value and label, each titled with its full text for when it is cut.
    function drawDetails(detail: string | string[] | undefined): void {
        detailEls.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
        var lines = (Array.isArray(detail) ? detail : [detail]).map(toText).filter(Boolean).slice(0, 2);
        detailEls = lines.map(function (line) {
            var el = make('span', 'base-stat-detail', { title: line }, line);
            root.insertBefore(el, trendEl);
            return el;
        });
    }

    function redraw(next: StatCardOptions): void {
        state = Object.assign({}, next);
        var labelTop = next.layout === 'label-top';
        var text = toText(next.value);
        var isText = /[^\d\s.,:%+\-\/]/.test(text);
        root.className = 'base-card base-stat' + (labelTop ? ' label-top' : '') + (isText ? ' text' : '');
        applyColor(root, next.color);
        if (labelTop) root.insertBefore(labelEl, valueEl);
        else root.insertBefore(valueEl, labelEl);
        valueEl.textContent = text;
        applyColor(valueEl, next.valueColor);
        labelEl.textContent = next.label || '';
        drawDetails(next.detail);
        trendEl.innerHTML = '';
        drawSparkline(next);
        var hasTrend = typeof next.trend === 'number' && !isNaN(next.trend);
        trendEl.hidden = !hasTrend;
        if (!hasTrend) return;
        var direction = next.trend! > 0 ? 'up' : (next.trend! < 0 ? 'down' : 'flat');
        var good = direction === 'flat' ? null : ((direction === 'up') === (next.positiveIsGood !== false));
        trendEl.className = 'base-stat-trend base-icon-text small ' + (good === null ? 'flat' : (good ? 'good' : 'bad'));
        trendEl.appendChild(icon(direction === 'up' ? 'arrow_upward' : (direction === 'down' ? 'arrow_downward' : 'remove')));
        var word = direction === 'up' ? (options!.trendUpText || 'Up') : (direction === 'down' ? (options!.trendDownText || 'Down') : (options!.trendFlatText || 'No change'));
        trendEl.appendChild(make('span', 'base-sr-only', null, word));
        trendEl.appendChild(make('span', '', null, Math.abs(next.trend!) + (next.trendSuffix || '') + (next.trendLabel ? ' ' + next.trendLabel : '')));
    }

    redraw(options);
    return {
        element: root,
        getValue: function () { return Object.assign({}, state); },
        setValue: function (next) { redraw(Object.assign({}, state, next || {})); },
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
