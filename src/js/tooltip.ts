import { make, nextId, listen, runAll, addToken, removeToken } from './lib/dom.js';
import { anchorPopover } from './lib/popover.js';
import type { PopoverHandle } from './lib/popover.js';
import type { ComponentHandle } from './types.js';

/** The side of its target a tooltip prefers, before it flips to stay on screen. */
export type TooltipPlacement = 'top' | 'bottom';

/** What bindTooltips takes. placement is the default side for every target under the root. */
export interface TooltipOptions {
    placement?: TooltipPlacement | string;
}

/** What bindTooltips returns. show shows the tip for one target. */
export interface TooltipHandle extends ComponentHandle {
    show(target: Element): void;
    hide(): void;
    destroy(): void;
}

var TIP_ATTR: string = 'data-base-tip';
var NATIVE_FOCUS: RegExp = /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/;

/**
 * Gives an element tooltip text through the data-base-tip attribute that bindTooltips reads. A target that cannot take focus gets tabindex 0 so the tooltip also shows from the keyboard.
 *
 * @param target element
 * @param text the tooltip sentence or phrase
 * @param placement 'top' or 'bottom' [optional]
 * @returns the target.
 */
export function setTooltip<T extends Element>(target: T, text: string, placement?: TooltipPlacement | string): T {
    target.setAttribute(TIP_ATTR, text);
    if (placement) target.setAttribute('data-base-tip-placement', placement);
    if (!NATIVE_FOCUS.test(target.tagName) && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '0');
    return target;
}

/**
 * Shows a floating tooltip when the pointer rests on, or keyboard focus reaches, any element under root that has a data-base-tip attribute. Escape, a click outside, scrolling, a resize, and leaving the element hide it, and aria-describedby points at the tip while it shows.
 *
 * @param root element whose descendants carry data-base-tip [optional, default the document body]
 * @param options { placement: 'top' or 'bottom' (default 'top') }
 * @returns { element, show, hide, destroy }. show(target) shows the tip for one element.
 * Set data-base-tip-placement on an element to override the placement. The tip flips to the other side when it would leave the screen.
 */
export function bindTooltips(root?: HTMLElement | null, options?: TooltipOptions): TooltipHandle {
    options = options || {};
    root = root || document.body;
    var cleanups: Array<() => void> = [];
    var current: Element | null = null;
    var popover: PopoverHandle | null = null;

    var tip = make('div', 'base-tooltip', { role: 'tooltip' });
    tip.id = nextId('tip');
    tip.hidden = true;
    document.body.appendChild(tip);

    function hide(): void {
        if (!current) return;
        removeToken(current, 'aria-describedby', tip.id);
        current = null;
        if (popover) popover.destroy();
        popover = null;
    }

    function show(target: Element): void {
        var text: string | null = target && target.getAttribute(TIP_ATTR);
        if (!text) return;
        hide();
        current = target;
        tip.textContent = text;
        addToken(target, 'aria-describedby', tip.id);
        var below: boolean = (target.getAttribute('data-base-tip-placement') || options!.placement) === 'bottom';
        popover = anchorPopover(target, tip, { align: 'center', prefer: below ? 'below' : 'above', follow: 'hide', returnFocus: false, onDismiss: hide });
        popover.open();
    }

    function targetOf(e: Event): Element | null {
        var found: Element | null = e.target && (e.target as Element).closest ? (e.target as Element).closest('[' + TIP_ATTR + ']') : null;
        return found && root!.contains(found) ? found : null;
    }

    cleanups.push(listen(root, 'mouseover', function (e: MouseEvent): void { var t = targetOf(e); if (t) show(t); }));
    cleanups.push(listen(root, 'mouseout', function (e: MouseEvent): void {
        var t = targetOf(e);
        if (t && !(e.relatedTarget && t.contains(e.relatedTarget as Node))) hide();
    }));
    cleanups.push(listen(root, 'focusin', function (e: FocusEvent): void { var t = targetOf(e); if (t) show(t); }));
    cleanups.push(listen(root, 'focusout', function (e: FocusEvent): void { if (targetOf(e)) hide(); }));

    return {
        element: tip,
        show: show,
        hide: hide,
        destroy: function (): void {
            hide();
            runAll(cleanups);
            if (tip.parentNode) tip.parentNode.removeChild(tip);
        }
    };
}
