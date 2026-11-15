import { make } from './lib/dom.js';
import type { ComponentHandle } from './types.js';

/** What createSkeleton takes. lines applies to type lines, and size to a block or a circle. */
export interface SkeletonOptions {
    type?: 'lines' | 'block' | 'circle' | string;
    lines?: number;
    size?: 'small' | 'medium' | 'large' | string;
    label?: string;
}

/** What createSkeleton returns. done clears aria-busy and swaps in the loaded content when given. */
export interface SkeletonHandle extends ComponentHandle {
    getValue(): string;
    setValue(next: string): void;
    done(content?: Node | null): void;
    destroy(): void;
}

/**
 * A placeholder for content that is loading, as lines of text, a block, or a circle. The wrapper is marked busy until done or destroy, and it carries a hidden label in a live region.
 *
 * @param options {
 *   type  : 'lines', 'block', or 'circle' (default 'lines')
 *   lines : number of lines for type lines (default 3)
 *   size  : 'small', 'medium', or 'large' for a block or a circle (default 'medium')
 *   label : text a screen reader reads (default 'Loading')
 * }
 * @returns { element, getValue, setValue, done, destroy }. getValue returns the label, and setValue replaces it. done(content) clears aria-busy and swaps in the loaded content, a node, when given. destroy also clears aria-busy.
 */
export function createSkeleton(options?: SkeletonOptions): SkeletonHandle {
    options = options || {};
    var type = options.type === 'block' || options.type === 'circle' ? options.type : 'lines';
    var size = options.size === 'small' || options.size === 'large' ? options.size : 'medium';
    var root = make('div', 'base-skeleton', { role: 'status', 'aria-busy': 'true' });
    var label: string = options.label || 'Loading';
    // The label is a live region of its own that stays in the page, so a change to it is announced.
    var text = make('span', 'base-sr-only', { 'aria-live': 'polite' }, label);
    root.appendChild(text);
    // A region is announced once it is in the page, so the label is written again a moment after the skeleton is inserted.
    var timer = setTimeout(function () { text.textContent = ''; text.textContent = label; }, 0);
    if (type === 'lines') {
        var wanted = Math.floor(Number(options.lines));
        var count = isFinite(wanted) ? Math.max(1, wanted) : 3;
        for (var i = 0; i < count; i++) root.appendChild(make('span', 'base-skeleton-line', { 'aria-hidden': 'true' }));
    } else {
        root.appendChild(make('span', 'base-skeleton-' + type + ' base-skeleton-' + size, { 'aria-hidden': 'true' }));
    }
    return {
        element: root,
        getValue: function () { return label; },
        setValue: function (next) { label = next || ''; text.textContent = label; },
        done: function (content) {
            clearTimeout(timer);
            root.removeAttribute('aria-busy');
            if (content && root.parentNode) root.parentNode.replaceChild(content, root);
        },
        destroy: function () {
            clearTimeout(timer);
            root.removeAttribute('aria-busy');
            if (root.parentNode) root.parentNode.removeChild(root);
        }
    };
}
