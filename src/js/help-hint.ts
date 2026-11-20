import { make, iconButton, nextId, listen, runAll } from './lib/dom.js';
import { anchorPopover } from './lib/popover.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

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
    var pinned: boolean = false;
    var hovered: boolean = false;
    var focused: boolean = false;

    var root = make('span', 'base-help');
    var button = iconButton('base-row-btn base-help-button', options.icon || 'help_outline', options.label || baseText('Help'));
    var bubble = make('span', 'base-help-tip', { role: 'tooltip' }, options.text);
    bubble.id = nextId('help');
    bubble.hidden = true;
    button.setAttribute('aria-describedby', bubble.id);
    root.appendChild(button);
    root.appendChild(bubble);

    var popover = anchorPopover(button, bubble, {
        align: 'start',
        inside: [root],
        returnFocus: false,
        onDismiss: function (): void { pinned = false; root.classList.remove('open'); }
    });

    function reveal(): void {
        popover.open();
        root.classList.add('open');
    }

    function conceal(): void {
        popover.close();
        root.classList.remove('open');
    }

    // Hover and focus show the bubble only while they last, and a click pins it until a second click.
    function settle(): void {
        if (pinned || hovered || focused) reveal();
        else conceal();
    }

    cleanups.push(listen(button, 'click', function (): void {
        pinned = !pinned;
        if (pinned) reveal();
        else conceal();
    }));
    cleanups.push(listen(root, 'mouseenter', function (): void { hovered = true; settle(); }));
    cleanups.push(listen(root, 'mouseleave', function (): void { hovered = false; settle(); }));
    cleanups.push(listen(root, 'focusin', function (): void { focused = true; settle(); }));
    cleanups.push(listen(root, 'focusout', function (): void { focused = false; settle(); }));

    return {
        element: root,
        getValue: function (): string { return bubble.textContent; },
        setValue: function (text: string): void { bubble.textContent = text || ''; },
        show: function (): void { pinned = true; reveal(); },
        hide: function (): void { pinned = false; conceal(); },
        destroy: function (): void { pinned = false; conceal(); runAll(cleanups); }
    };
}
