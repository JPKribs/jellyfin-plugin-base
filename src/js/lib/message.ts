// message.ts
// The parts every message shares: the icon of each state and the dismiss button. The field message, the status line, the banner, and the toast are each an icon and text in a state color, built as base-icon-text, and differ only in their frame and how long they stay. None of it is exported from the bundle.

import { iconButton } from './dom.js';

/** The icon each message state shows. Neutral is a muted note, so it takes the info icon. */
export var MESSAGE_ICONS: Record<string, string> = { error: 'error', warn: 'warning', success: 'check_circle', info: 'info', neutral: 'info' };

/**
 * Builds a message's dismiss button, the close row button that every dismissible message pins to its top right corner.
 * Internal to the web components.
 *
 * @param className the message's own class for the button, such as base-toast-close
 * @param label the button's title and aria-label
 * @returns the button
 */
export function dismissButton(className: string, label: string): HTMLButtonElement {
    return iconButton('base-row-btn ' + className, 'close', label);
}
