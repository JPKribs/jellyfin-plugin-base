import { make } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import type { ComponentHandle } from './types.js';

/** What createProgressRing takes. value is a percent from 0 to 100. */
export interface ProgressRingOptions {
    value?: number | string;
    size?: 'small' | 'medium' | 'large' | string;
    color?: string;
    label?: string;
    showValue?: boolean;
    pie?: boolean;
}

/** What createProgressRing returns. setValue clamps the percent between 0 and 100. */
export interface ProgressRingHandle extends ComponentHandle {
    getValue(): number;
    setValue(next: number | string): void;
    destroy(): void;
}

var SVG_NS: string = 'http://www.w3.org/2000/svg';

/**
 * A circular progress indicator with its percent in the middle. It is an SVG ring, role progressbar, and the arc length is set through stroke-dasharray on a path of length 100.
 *
 * @param options {
 *   value     : percent from 0 to 100 (default 0)
 *   size      : 'small', 'medium', or 'large' (default 'medium')
 *   color     : status color name or hex code for the arc, such as 'green' or '#e91e63' (default the accent)
 *   label     : aria-label (default 'Progress')
 *   showValue : false hides the percent text (default true)
 *   pie       : true fills a small disc like a pie, with no text, such as beside a small button (default false)
 * }
 * @returns { element, getValue, setValue, destroy }. getValue returns the percent, and setValue clamps it between 0 and 100.
 */
export function createProgressRing(options?: ProgressRingOptions): ProgressRingHandle {
    options = options || {};
    var size = options.size === 'small' || options.size === 'large' ? options.size : 'medium';
    var pie = options.pie === true;
    var value: number = 0;

    var root = make('span', 'base-ring base-ring-' + size + (pie ? ' base-ring-pie' : ''), {
        role: 'progressbar', 'aria-label': options.label || 'Progress', 'aria-valuemin': '0', 'aria-valuemax': '100'
    });
    applyColor(root, options.color);
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('aria-hidden', 'true');
    var track = document.createElementNS(SVG_NS, 'circle');
    var arc = document.createElementNS(SVG_NS, 'circle');
    [track, arc].forEach(function (c) {
        c.setAttribute('cx', '18');
        c.setAttribute('cy', '18');
        // A pie draws its wedge as a stroke as wide as the disc, so the arc fills from the center out.
        c.setAttribute('r', pie ? '9' : '15.9155');
        c.setAttribute('fill', 'none');
        c.setAttribute('pathLength', '100');
    });
    track.setAttribute('class', 'base-ring-track');
    arc.setAttribute('class', 'base-ring-arc');
    svg.appendChild(track);
    svg.appendChild(arc);
    var text = make('span', 'base-ring-value');
    text.hidden = pie || options.showValue === false;
    root.appendChild(svg);
    root.appendChild(text);

    function setValue(next: number | string | undefined): void {
        var n = parseFloat(next as string);
        value = isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
        arc.setAttribute('stroke-dasharray', value + ' 100');
        root.setAttribute('aria-valuenow', String(value));
        text.textContent = Math.round(value) + '%';
    }

    setValue(options.value);
    return {
        element: root,
        getValue: function () { return value; },
        setValue: setValue,
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
