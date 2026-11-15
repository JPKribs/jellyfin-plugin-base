import type { Poller, PollerOptions } from './types.js';

/**
 * Builds a self-guarding interval that never overlaps a slow fn. The bag calls it as shared.createPoller.
 *
 * @param fn function run on each tick, which may return a promise
 * @param intervalMs milliseconds between ticks (default 3000)
 * @param opts { pauseWhenHidden } [optional]
 */
export function createPoller(fn: () => unknown, intervalMs?: number, opts?: PollerOptions): Poller {
    var timer: ReturnType<typeof setInterval> | null = null;
    var inFlight = false;
    var pauseWhenHidden = !!(opts && opts.pauseWhenHidden);
    function tick() {
        if (inFlight) return;
        inFlight = true;
        Promise.resolve()
            .then(fn)
            .catch(function () { /* transient, try again next tick */ })
            .then(function () { inFlight = false; });
    }
    // A hidden tab skips its ticks when pauseWhenHidden is set.
    function scheduled() {
        if (pauseWhenHidden && document.hidden) return;
        tick();
    }
    function onVisibility() {
        if (!document.hidden) tick();
    }
    return {
        start: function (immediate?: boolean) {
            if (timer) return;
            if (immediate !== false) scheduled();
            timer = setInterval(scheduled, intervalMs || 3000);
            if (pauseWhenHidden) document.addEventListener('visibilitychange', onVisibility);
        },
        stop: function () {
            if (timer) { clearInterval(timer); timer = null; }
            if (pauseWhenHidden) document.removeEventListener('visibilitychange', onVisibility);
        },
        isRunning: function () { return !!timer; }
    };
}
