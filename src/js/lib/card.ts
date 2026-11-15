// card.ts
// The count card that count cards, the stat card, and the filtered list's filter cards share: a large count over a label, tinted by a color. None of it is exported from the bundle.

import { make, toText } from './dom.js';
import { applyColor } from './color.js';

/** What buildCard takes. tag is button for a card that acts, color is a status color name or a hex code, and className and attrs go on the card. */
export interface CardOptions {
    tag?: 'div' | 'button';
    count?: unknown;
    label?: unknown;
    color?: unknown;
    className?: string;
    attrs?: Record<string, unknown> | null;
}

/** What buildCard returns: the card and its count and label, so a variation can add to it or change the count. */
export interface CardParts {
    element: HTMLElement;
    count: HTMLElement;
    label: HTMLElement;
}

/**
 * Builds a base-card: a large count over a label, in the color of its status. A count card, a stat card, and a filter
 * card are each this card, with a part or a behavior added.
 * Internal to the web components.
 *
 * @param opts { tag (default 'div'), count, label, color, className, attrs }
 * @returns { element, count, label }
 */
export function buildCard(opts: CardOptions): CardParts {
    var card = make(opts.tag || 'div', 'base-card' + (opts.className ? ' ' + opts.className : ''), opts.attrs || null);
    applyColor(card, opts.color);
    var count = make('span', 'base-card-count', null, toText(opts.count));
    var label = make('span', 'base-card-label', null, toText(opts.label));
    card.appendChild(count);
    card.appendChild(label);
    return { element: card, count: count, label: label };
}
