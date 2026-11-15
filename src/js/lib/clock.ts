// clock.ts
// The one shared ticking clock that every live time on a page runs on. One timer serves every subscriber, waits only until the soonest one needs to change, and stops when none is left on the page. None of it is exported from the bundle.

/** A subscriber: tick draws its text for the time now and returns how many milliseconds until its text next changes, and el tells whether it is still on the page. */
export interface ClockEntry {
    el: Element;
    tick(now: number): number;
}

/** What watchClock returns. stop takes the subscriber off the clock. */
export interface ClockHandle {
    stop(): void;
    refresh(): void;
}

interface Watched {
    entry: ClockEntry;
    due: number;
    seen: boolean;
    born: number;
}

var watched: Watched[] = [];
var timer: ReturnType<typeof setTimeout> | null = null;
var timerDue = 0;
// The shortest wait, so a countdown never ticks faster than once a second.
var MIN_WAIT = 250;
// The longest wait, so a value that changes once a day still checks back, and a subscriber that never reaches the page is dropped.
var MAX_WAIT = 60 * 60 * 1000;
var GRACE = 60 * 1000;

/** The time the clock reads, which a test can replace. */
export var clockNow: { now(): number } = { now: function () { return Date.now(); } };

/**
 * How many subscribers the clock holds, and whether its timer runs, for tests.
 * Internal to the web components.
 */
export function clockState(): { count: number; running: boolean } {
    return { count: watched.length, running: timer !== null };
}

function schedule(): void {
    if (!watched.length) {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        return;
    }
    var now = clockNow.now();
    var soonest = Math.min.apply(null, watched.map(function (w) { return w.due; }));
    var wait = Math.max(MIN_WAIT, Math.min(MAX_WAIT, soonest - now));
    if (timer !== null && timerDue <= now + wait) return;
    if (timer !== null) clearTimeout(timer);
    timerDue = now + wait;
    timer = setTimeout(run, wait);
}

function run(): void {
    timer = null;
    var now = clockNow.now();
    watched = watched.filter(function (w) {
        var on = w.entry.el.isConnected;
        if (on) w.seen = true;
        // A subscriber that left the page, or never reached it, comes off the clock, so the timer stops with no one left.
        if (!on && (w.seen || now - w.born > GRACE)) return false;
        if (w.due <= now + MIN_WAIT / 2) w.due = now + Math.max(MIN_WAIT, w.entry.tick(now));
        return true;
    });
    schedule();
}

/**
 * Puts a subscriber on the shared clock. Its tick runs once at once, then again each time the text it returned is due to change.
 * Internal to the web components.
 *
 * @param entry { el, tick(now) returning the milliseconds until the next change }
 * @returns { stop, refresh }, where refresh runs tick again at once, such as after a new value.
 */
export function watchClock(entry: ClockEntry): ClockHandle {
    var now = clockNow.now();
    var item: Watched = { entry: entry, due: now + Math.max(MIN_WAIT, entry.tick(now)), seen: entry.el.isConnected, born: now };
    watched.push(item);
    schedule();
    return {
        stop: function () {
            watched = watched.filter(function (w) { return w !== item; });
            schedule();
        },
        refresh: function () {
            var t = clockNow.now();
            item.due = t + Math.max(MIN_WAIT, entry.tick(t));
            if (watched.indexOf(item) === -1) watched.push(item);
            schedule();
        }
    };
}
