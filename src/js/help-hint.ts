import { make, icon, nextId, listen, runAll, claimEscape, placeBox, viewport } from './dom-util.js';
import type { ComponentHandle } from './types.js';

/** What createHelpHint takes. text is the plain text explanation the bubble shows. */
export interface HelpHintOptions {
    text: string;
    label?: string;
    icon?: string;
}

/** What createHelpHint returns. getValue returns the text, and setValue replaces it. */
export interface HelpHintHandle extends ComponentHandle {
    getValue(): string;
    setValue(text: string): void;
    show(): void;
    hide(): void;
    destroy(): void;
}

/**
 * A small help icon button for next to a label, with a bubble that explains the field. The bubble shows on hover and focus, and a click or tap toggles it. The button is described by the bubble through aria-describedby, and Escape or a click outside closes it.
 *
 * @param options {
 *   text  : the explanation, plain text [required]
 *   label : aria-label of the button (default 'Help')
 *   icon  : Material icon name (default 'help_outline')
 * }
 * @returns { element, getValue, setValue, show, hide, destroy }. getValue returns the text, and setValue replaces it.
 */
export function createHelpHint(options: HelpHintOptions): HelpHintHandle {
    options = options || {} as HelpHintOptions;
    if (typeof options.text !== 'string') throw new Error('createHelpHint needs a text string');
    var cleanups: Array<() => void> = [];
    var docCleanups: Array<() => void> = [];
    var followCleanups: Array<() => void> = [];
    var hovered: boolean = false;
    var focused: boolean = false;

    var root = make('span', 'jpk-help');
    var button = make('button', 'jpk-help-button', { type: 'button', title: options.label || 'Help', 'aria-label': options.label || 'Help' });
    button.appendChild(icon(options.icon || 'help_outline'));
    var bubble = make('span', 'jpk-help-tip', { role: 'tooltip' }, options.text);
    bubble.id = nextId('help');
    button.setAttribute('aria-describedby', bubble.id);
    root.appendChild(button);
    root.appendChild(bubble);

    // Fixed to the viewport so a panel or a scrolling area never clips it and a narrow screen keeps it on screen.
    function place(): void {
        bubble.style.top = '0px';
        bubble.style.left = '0px';
        var box = bubble.getBoundingClientRect();
        var spot = placeBox(button.getBoundingClientRect(), { width: box.width, height: box.height }, viewport(), { align: 'start', gap: 6 });
        bubble.style.top = spot.top + 'px';
        bubble.style.left = spot.left + 'px';
    }

    // Tracks the scroll and the size of the window while the bubble is showing, by hover, focus, or a tap.
    function follow(): void {
        if (followCleanups.length) return;
        place();
        followCleanups.push(listen(window, 'scroll', place, true));
        followCleanups.push(listen(window, 'resize', place));
    }

    function hide(): void {
        root.classList.remove('open');
        claimEscape(root, false);
        runAll(docCleanups);
        if (!hovered && !focused) runAll(followCleanups);
    }

    function show(): void {
        if (root.classList.contains('open')) return;
        root.classList.add('open');
        claimEscape(root, true);
        follow();
        docCleanups.push(listen(document, 'click', function (e: MouseEvent): void { if (!root.contains(e.target as Node)) hide(); }));
    }

    cleanups.push(listen(button, 'click', function (): void {
        if (root.classList.contains('open')) hide();
        else show();
    }));
    cleanups.push(listen(root, 'mouseenter', function (): void { hovered = true; follow(); }));
    cleanups.push(listen(root, 'mouseleave', function (): void { hovered = false; if (!focused && !root.classList.contains('open')) runAll(followCleanups); }));
    cleanups.push(listen(root, 'focusin', function (): void { focused = true; follow(); }));
    cleanups.push(listen(root, 'focusout', function (): void { focused = false; if (!hovered && !root.classList.contains('open')) runAll(followCleanups); }));
    cleanups.push(listen(root, 'keydown', function (e: KeyboardEvent): void { if (e.key === 'Escape') hide(); }));

    return {
        element: root,
        getValue: function (): string { return bubble.textContent; },
        setValue: function (text: string): void { bubble.textContent = text || ''; },
        show: show,
        hide: hide,
        destroy: function (): void { hide(); runAll(followCleanups); runAll(cleanups); }
    };
}
