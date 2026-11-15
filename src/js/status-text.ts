import { make, icon, clear } from './lib/dom.js';
import { MESSAGE_ICONS } from './lib/message.js';

/** What setStatus takes beyond the message. state picks the look over isError, such as 'info' for a line like Checking. */
export interface StatusOptions {
    timeout?: number;
    state?: 'success' | 'error' | 'warn' | 'info';
}

var STATES = ['success', 'error', 'warn', 'info'];

// Takes the message and its state off a status element.
function wipe(el: Element): void {
    clear(el);
    delete (el as HTMLElement).dataset.baseStatus;
    el.classList.remove('base-status-ok', 'base-status-bad', 'base-icon-text');
    STATES.forEach(function (s) { el.classList.remove(s); });
}

/**
 * Shows a status message in an element of the view, with the icon of its state lined up beside the text, as a field
 * message shows it, and clears it after a timeout. The bag calls it as shared.setStatus.
 *
 * @param view page element the id is looked up in
 * @param elementId id of the status element, or the element itself
 * @param message text to show, or '' to clear it
 * @param isError true shows it as an error and announces it as an alert, and false as a success
 * @param opts { timeout, state } where timeout in milliseconds, 0 keeping the message (default 5000), and state, 'success', 'error', 'warn', or 'info', overrides isError [optional]
 */
export function setStatus(view: ParentNode, elementId: string | Element, message: string, isError?: boolean, opts?: StatusOptions): void {
    var el = typeof elementId === 'string' ? view.querySelector('#' + elementId) : elementId;
    if (!el) return;
    opts = opts || {};
    var state = opts.state && STATES.indexOf(opts.state) !== -1 ? opts.state : isError ? 'error' : 'success';
    // The role goes on before the text, so a screen reader announces the change.
    if (message) {
        var role = state === 'error' ? 'alert' : 'status';
        if (el.getAttribute('role') !== role) el.setAttribute('role', role);
    }
    wipe(el);
    if (message) {
        el.classList.add('base-icon-text', state, state === 'error' || state === 'warn' ? 'base-status-bad' : 'base-status-ok');
        (el as HTMLElement).dataset.baseStatus = message;
        el.appendChild(icon(MESSAGE_ICONS[state]));
        el.appendChild(make('span', 'base-status-message', null, message));
    }
    var timeout = opts.timeout != null ? opts.timeout : 5000;
    if (message && timeout > 0) {
        setTimeout(function () {
            if ((el as HTMLElement).dataset.baseStatus === message) wipe(el!);
        }, timeout);
    }
}
