import { make, toText, clockText } from './lib/dom.js';
import { watchClock } from './lib/clock.js';
import type { ClockHandle } from './lib/clock.js';
import { createProgressRing } from './progress-ring.js';
import type { ProgressRingHandle } from './progress-ring.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** A moment a relative time shows: a Date, milliseconds since 1970, or a date string such as an ISO date. */
export type RelativeTimeValue = Date | number | string | null | undefined;

/** What createRelativeTime takes. countdown shows the time left to value, and start is when that wait began, for the ring. */
export interface RelativeTimeOptions {
    value?: RelativeTimeValue;
    countdown?: boolean;
    start?: RelativeTimeValue;
    ring?: boolean;
    doneText?: string;
    emptyText?: string;
    ringLabel?: string;
    locale?: string;
    onDone?(): void;
}

/** What createRelativeTime returns. getValue returns the moment as a Date, or null. */
export interface RelativeTimeHandle extends ComponentHandle {
    getValue(): Date | null;
    setValue(value: RelativeTimeValue, start?: RelativeTimeValue): void;
    destroy(): void;
}

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
// The steps of a relative time, each with the age up to which it is used and how often its text can change.
var STEPS: Array<{ unit: Intl.RelativeTimeFormatUnit; size: number; upTo: number }> = [
    { unit: 'second', size: SECOND, upTo: 45 * SECOND },
    { unit: 'minute', size: MINUTE, upTo: 45 * MINUTE },
    { unit: 'hour', size: HOUR, upTo: 22 * HOUR },
    { unit: 'day', size: DAY, upTo: 26 * DAY },
    { unit: 'month', size: 30 * DAY, upTo: 320 * DAY },
    { unit: 'year', size: 365 * DAY, upTo: Infinity }
];

/**
 * Reads a moment as a Date.
 *
 * @param value a Date, milliseconds, or a date string
 * @returns the Date, or null when the value is not a moment
 */
export function toDate(value: RelativeTimeValue): Date | null {
    if (value === null || value === undefined || value === '') return null;
    var d = value instanceof Date ? new Date(value.getTime()) : new Date(value as string | number);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Writes how far a moment is from now, such as "3 minutes ago", "in 2 hours", or "just now", through the browser's Intl.RelativeTimeFormat in the page's language.
 *
 * @param diff milliseconds from now to the moment, negative for the past
 * @param locale the language [optional]
 * @returns { text, next } where next is how many milliseconds until the text can change
 */
export function relativeText(diff: number, locale?: string): { text: string; next: number } {
    var age = Math.abs(diff);
    var step = STEPS.filter(function (s) { return age < s.upTo; })[0] || STEPS[STEPS.length - 1];
    var amount = step.unit === 'second' ? 0 : Math.round(diff / step.size);
    var text: string;
    if (typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function') {
        text = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(amount, step.unit);
        // English reads "Last sync just now", so the bare "now" Intl gives becomes "just now".
        if (text === 'now') text = 'just now';
    } else if (!amount) {
        text = 'just now';
    } else {
        var n = Math.abs(amount);
        var word = step.unit + (n === 1 ? '' : 's');
        text = amount < 0 ? n + ' ' + word + ' ago' : 'in ' + n + ' ' + word;
    }
    // A text changes at most every quarter of its unit, so an old value checks back rarely.
    var next = step.unit === 'second' ? Math.max(SECOND, 45 * SECOND - age) : step.size / 4;
    return { text: text, next: next };
}

/**
 * Writes a time left as a clock, such as 4:05 or 1:02:03.
 *
 * @param ms milliseconds left
 * @returns the text
 */
export function countdownText(ms: number): string {
    return clockText(Math.max(0, Math.ceil(ms / SECOND)));
}

// The full date of a moment for the title, in the page's language.
function fullDate(d: Date, locale?: string): string {
    try {
        return d.toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' } as Intl.DateTimeFormatOptions);
    } catch (e) {
        return d.toLocaleString();
    }
}

/**
 * A live time, such as "3 minutes ago" or "in 2 minutes", with the full date as its title. Every live time on a page runs on one shared clock that ticks only when a text is due to change, more slowly as a value ages, and stops when none is left on the page.
 * The countdown mode shows the time left as a clock, such as 4:05, with an optional progress ring from start to the moment, and calls onDone once when it reaches zero.
 *
 * @param options {
 *   value     : the moment, a Date, milliseconds, or a date string [optional]
 *   countdown : true shows the time left as a clock (default false)
 *   start     : when the wait began, which the ring fills from [optional]
 *   ring      : true adds a small progress ring beside a countdown, which needs start (default false)
 *   doneText  : the text once a countdown reaches zero (default 'Now')
 *   emptyText : the text with no moment (default '')
 *   ringLabel : the ring's accessible name (default 'Time elapsed')
 *   locale    : the language of the text and the title (default the browser's)
 *   onDone    : function() called once when a countdown reaches zero [optional]
 * }
 * @returns { element, getValue, setValue, destroy }. setValue(value, start) shows another moment.
 */
export function createRelativeTime(options?: RelativeTimeOptions): RelativeTimeHandle {
    var opts = options || {};
    var moment: Date | null = null;
    var begin: Date | null = null;
    var done = false;
    var root = make('span', 'base-relative-time' + (opts.countdown ? ' countdown' : ''));
    var timeEl = make('time', 'base-relative-time-text');
    var ring: ProgressRingHandle | null = null;
    if (opts.countdown && opts.ring) {
        ring = createProgressRing({ size: 'small', pie: true, label: opts.ringLabel || baseText('Base.TimeElapsed') });
        root.appendChild(ring.element);
    }
    root.appendChild(timeEl);

    function tick(now: number): number {
        if (!moment) {
            timeEl.textContent = toText(opts.emptyText);
            return 60 * MINUTE;
        }
        var diff = moment.getTime() - now;
        if (!opts.countdown) {
            var rel = relativeText(diff, opts.locale);
            timeEl.textContent = rel.text;
            return rel.next;
        }
        if (ring && begin) {
            var whole = moment.getTime() - begin.getTime();
            ring.setValue(whole > 0 ? (now - begin.getTime()) / whole * 100 : 100);
        }
        if (diff <= 0) {
            timeEl.textContent = opts.doneText || baseText('Base.Now');
            root.classList.add('done');
            if (!done) {
                done = true;
                if (opts.onDone) opts.onDone();
            }
            return 60 * MINUTE;
        }
        root.classList.remove('done');
        timeEl.textContent = countdownText(diff);
        return (diff % SECOND) || SECOND;
    }

    var clock: ClockHandle | null = null;

    function setValue(value: RelativeTimeValue, start?: RelativeTimeValue): void {
        moment = toDate(value);
        if (start !== undefined) begin = toDate(start);
        done = false;
        if (moment) {
            timeEl.setAttribute('datetime', moment.toISOString());
            timeEl.setAttribute('title', fullDate(moment, opts.locale));
        } else {
            timeEl.removeAttribute('datetime');
            timeEl.removeAttribute('title');
        }
        if (clock) clock.refresh();
        else clock = watchClock({ el: root, tick: tick });
    }

    begin = toDate(opts.start);
    setValue(opts.value);
    return {
        element: root,
        getValue: function () { return moment ? new Date(moment.getTime()) : null; },
        setValue: setValue,
        destroy: function () { if (clock) clock.stop(); }
    };
}

/**
 * A render function for a Data Table column or a Filtered List that draws a live relative time from each row.
 *
 * @param pick the key of the row's moment, or a function(row) returning it
 * @param options the createRelativeTime options, without value [optional]
 * @returns function(row) returning the live time element
 */
export function renderRelative<T>(pick: string | ((row: T) => RelativeTimeValue), options?: RelativeTimeOptions): (row: T) => HTMLElement {
    return function (row: T): HTMLElement {
        var value = typeof pick === 'function' ? pick(row) : (row as unknown as Record<string, RelativeTimeValue>)[pick];
        return createRelativeTime(Object.assign({}, options || {}, { value: value })).element;
    };
}
