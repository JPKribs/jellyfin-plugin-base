import { createProgressRing } from './progress-ring.js';
import type { ProgressRingHandle } from './progress-ring.js';
import type { TaskProgressHandle, ScheduledTaskInfo } from './types.js';

/**
 * Turns a button into a live progress display for a Jellyfin scheduled task. The bag calls it as shared.pollTaskProgress.
 * A medium or large button fills a progress bar along its bottom. A small button is too short for one, so a progress ring's pie beside it fills instead.
 *
 * @param btn the button that starts the task
 * @param taskKey key of the scheduled task
 * @param label button text, which the percent follows while it runs
 * @param onComplete function called once when the task finishes [optional]
 */
export function pollTaskProgress(btn: HTMLButtonElement, taskKey: string, label: string, onComplete?: () => void): TaskProgressHandle {
    var btnSpan = btn.querySelector('span');
    var small = btn.classList.contains('small');
    var pie: ProgressRingHandle | null = null;
    var progressBar = small ? null : btn.querySelector<HTMLElement>('.btn-progress');
    if (small) {
        pie = createProgressRing({ pie: true, label: label });
        pie.element.classList.add('base-btn-progress-pie');
        if (btn.parentNode) btn.parentNode.insertBefore(pie.element, btn.nextSibling);
    } else {
        if (!progressBar) {
            progressBar = document.createElement('div');
            btn.appendChild(progressBar);
        }
        // A bar the plugin's markup already holds takes the same classes, so it draws as the progress bar.
        progressBar.classList.add('btn-progress', 'base-progress-bar', 'base-btn-progress');
        btn.classList.add('base-btn-progress-host');
    }
    btn.disabled = true;

    var lastPct = 0;
    var sawRunning = false;
    var startedAt = Date.now();
    var done = false;
    var socketBound = false;
    var poll: ReturnType<typeof setInterval> | null = null;

    var send = ApiClient && (ApiClient.sendMessage || ApiClient.sendWebSocketMessage);
    if (send) send = send.bind(ApiClient);

    // Shows a percent that never goes backward and never passes 100.
    function setPct(pct: number | undefined) {
        if (typeof pct !== 'number' || isNaN(pct)) pct = lastPct;
        if (pct < lastPct) pct = lastPct;
        if (pct > 100) pct = 100;
        lastPct = pct;
        if (btnSpan) btnSpan.textContent = label + ' ' + Math.round(pct) + '%';
        if (pie) pie.setValue(pct);
        else progressBar!.style.width = pct + '%';
    }

    // Stops the socket and the poll, resets the button, and calls onComplete once.
    function finish() {
        if (done) return;
        done = true;
        if (socketBound) {
            try { send!('ScheduledTasksInfoStop'); } catch (e) { /* socket already closed */ }
            try { Events!.off(ApiClient, 'message', onMessage); } catch (e) { /* never bound */ }
        }
        if (poll) clearInterval(poll);
        if (btnSpan) btnSpan.textContent = label;
        if (pie) pie.destroy();
        else progressBar!.style.width = '0%';
        btn.disabled = false;
        if (onComplete) onComplete();
    }

    // Shows a running task's progress, and finishes once it is idle after running or after a run that ended since the start.
    function apply(task: ScheduledTaskInfo | undefined) {
        if (!task) return;
        if (task.State === 'Running') {
            sawRunning = true;
            setPct(task.CurrentProgressPercentage);
        } else if (task.State === 'Idle') {
            var end = task.LastExecutionResult && task.LastExecutionResult.EndTimeUtc;
            var endedAfterStart = end && new Date(end).getTime() >= startedAt - 1000;
            if (sawRunning || endedAfterStart) { setPct(100); finish(); }
        }
    }

    function onMessage(e: any, msg?: any) {
        msg = msg || e;
        if (!msg || msg.MessageType !== 'ScheduledTasksInfo' || !msg.Data) return;
        apply(msg.Data.find(function (t: ScheduledTaskInfo) { return t.Key === taskKey; }));
    }

    setPct(0);

    // Prefer the dashboard WebSocket when its event bus is reachable.
    if (send && typeof Events !== 'undefined') {
        try {
            Events.on(ApiClient, 'message', onMessage);
            send('ScheduledTasksInfoStart', '0,1000');
            socketBound = true;
        } catch (e) {
            socketBound = false;
        }
    }

    // Poll as a safety net: fast when polling is the only source, slow to reconcile the socket.
    poll = setInterval(function () {
        if (Date.now() - startedAt > 30 * 60 * 1000) { finish(); return; }
        ApiClient!.getScheduledTasks().then(function (tasks) {
            apply(tasks.find(function (t: ScheduledTaskInfo) { return t.Key === taskKey; }));
        }).catch(function () { /* transient, try again next tick */ });
    }, socketBound ? 5000 : 1000);

    return { cancel: finish };
}
