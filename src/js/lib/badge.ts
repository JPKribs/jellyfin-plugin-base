// badge.ts
// The one badge maker every component and the bag build a base-badge with, as an element or as markup.

import { make } from './dom.js';
import { COLOR_NAMES, isHexColor, applyColor, colorStyle } from './color.js';
import { classNames } from './class-names.js';
import { escapeHtml } from '../browser-helpers.js';
import { BADGE_STATES } from '../badge.js';
import type { BadgeState } from '../types.js';

/** A badge size on the size scale. Small is the default and needs no modifier. */
export type BadgeSize = 'small' | 'medium' | 'large';

var SIZES: string[] = ['small', 'medium', 'large'];

/**
 * Resolves a badge color option to what applyColor takes: a status color name, a hex code, or the color a BADGE_STATES state name draws in.
 *
 * @param color a status color name, a hex code, or a state name such as 'Errored'
 * @param fallback the color for anything else [optional]
 * @returns the color name or hex code, or the fallback, or ''
 */
export function badgeColor(color: unknown, fallback?: string): string {
    if (typeof color === 'string' && COLOR_NAMES.indexOf(color) !== -1) return color;
    if (isHexColor(color)) return color.trim();
    if (typeof color === 'string' && Object.prototype.hasOwnProperty.call(BADGE_STATES.stateColors, color)) {
        return BADGE_STATES.stateColors[color as BadgeState];
    }
    return fallback || '';
}

// The class list after base-badge and its color: the size modifier, then the caller's own classes.
function extraClasses(size: unknown, className: unknown): string {
    var parts: string[] = [];
    if (size === 'medium' || size === 'large') parts.push(size);
    var own = classNames(className);
    if (own) parts.push(own);
    return parts.length ? ' ' + parts.join(' ') : '';
}

/**
 * Builds a base-badge element. A color outside badgeColor leaves the badge uncolored, so pass a fallback through badgeColor when it needs one.
 *
 * @param label the badge text
 * @param color a status color name, a hex code, or a BADGE_STATES state name
 * @param size 'small', 'medium', or 'large' (default 'small') [optional]
 * @param className the caller's own classes, after the color and size [optional]
 * @returns the span
 */
export function makeBadge(label: unknown, color: unknown, size?: BadgeSize | string | null, className?: string | null): HTMLSpanElement {
    var el = make('span', 'base-badge', null, label === undefined || label === null ? '' : label);
    var resolved = badgeColor(color);
    if (resolved) applyColor(el, resolved);
    var extra = extraClasses(size, className);
    if (extra) el.className += extra;
    return el;
}

/**
 * Builds the markup of a base-badge, the same badge makeBadge builds, for a component that renders text. The label is escaped.
 *
 * @param label the badge text
 * @param color a status color name, a hex code, or a BADGE_STATES state name
 * @param size 'small', 'medium', or 'large' (default 'small') [optional]
 * @param className the caller's own classes, after the color and size [optional]
 * @returns the span markup
 */
export function badgeHtml(label: unknown, color: unknown, size?: BadgeSize | string | null, className?: string | null): string {
    var resolved = badgeColor(color);
    var cls = 'base-badge' + (resolved ? ' ' + (isHexColor(resolved) ? 'custom' : resolved) : '') + extraClasses(size, className);
    return '<span class="' + cls + '"' + colorStyle(resolved) + '>' + escapeHtml(label) + '</span>';
}

/**
 * Builds badge markup from a class string such as 'green medium' or '#e91e63', as the bag's badge and the card list take it.
 * The first color or hex token colors the badge, a size token sizes it, and the other tokens stay as classes.
 *
 * @param label the badge text
 * @param cls the class string
 * @returns the span markup
 */
export function classBadgeHtml(label: unknown, cls: unknown): string {
    var color = '';
    var size = '';
    var rest: string[] = [];
    String(cls === undefined || cls === null ? '' : cls).split(/\s+/).filter(Boolean).forEach(function (token) {
        if (!color && (COLOR_NAMES.indexOf(token) !== -1 || isHexColor(token))) color = token;
        else if (!size && SIZES.indexOf(token) !== -1) size = token;
        else rest.push(token);
    });
    return badgeHtml(label, color, size, rest.join(' '));
}
