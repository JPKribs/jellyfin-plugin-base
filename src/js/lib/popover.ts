// popover.ts
// The shared core of every floating panel anchored to a control: the overflow menu, the filter panel, the help hint, the tooltip, and the typeahead dropdown.

import { listen, runAll, claimEscape, placeBox, viewport } from './dom.js';

/** Why an open popover closed on its own. */
export type PopoverDismissReason = 'escape' | 'outside' | 'scroll' | 'resize';

/** What anchorPopover takes. */
export interface PopoverOptions {
    align?: 'start' | 'end' | 'center';
    prefer?: 'below' | 'above';
    gap?: number;
    inside?: Array<Element | null | undefined>;
    follow?: 'track' | 'hide';
    returnFocus?: boolean;
    onDismiss?(reason: PopoverDismissReason): void;
}

/** What anchorPopover returns. */
export interface PopoverHandle {
    open(): void;
    close(): void;
    place(): void;
    isOpen(): boolean;
    destroy(): void;
}

var GAP_FALLBACK: number = 8;

/**
 * Reads the narrow spacing token as pixels where the element sits, so a popover keeps the gap the CSS uses.
 * Internal to the web components.
 */
export function popoverGap(el: Element): number {
    var raw: string = '';
    if (typeof window.getComputedStyle === 'function') {
        try { raw = window.getComputedStyle(el).getPropertyValue('--base-gap-narrow'); } catch (e) { raw = ''; }
    }
    var px: number = parseFloat(raw);
    return isNaN(px) ? GAP_FALLBACK : px;
}

/**
 * Anchors a floating box, fixed to the viewport, to a control, and gives it the shared base-float surface. While open it places the box beside the anchor, follows or hides on a scroll and a resize, closes on Escape and on a click outside, and claims Escape from a dialog around it. With returnFocus, a dismiss that would drop focus returns it to the anchor.
 *
 * @param anchor control the box opens beside
 * @param box floating element, fixed to the viewport by its CSS, which starts hidden
 * @param options {
 *   align     : 'start', 'end', or 'center' along the anchor (default 'center')
 *   prefer    : 'below' or 'above', the side before it flips for room (default 'below')
 *   gap       : pixels between the anchor and the box (default the --base-gap-narrow token)
 *   inside    : more elements a click counts as inside, beside the anchor and the box [optional]
 *   follow    : 'track' places the box again on a scroll or a resize, 'hide' dismisses it (default 'track')
 *   returnFocus : focus the anchor after a dismiss that would drop focus, false for a box that opens on focus (default true)
 *   onDismiss : function(reason) called after Escape, an outside click, or with follow 'hide' a scroll or a resize closes it [optional]
 * }
 * @returns { open, close, place, isOpen, destroy }.
 * Internal to the web components.
 */
export function anchorPopover(anchor: Element, box: HTMLElement, options?: PopoverOptions): PopoverHandle {
    options = options || {};
    var openCleanups: Array<() => void> = [];
    var claimed: Element[] = [];
    var shown: boolean = false;
    var gap: number = GAP_FALLBACK;
    box.classList.add('base-float');

    function members(): Element[] {
        return [anchor, box].concat((options!.inside || []).filter(Boolean) as Element[]);
    }

    function contains(node: Node | null): boolean {
        return !!node && members().some(function (el: Element): boolean { return el === node || el.contains(node); });
    }

    function place(): void {
        if (!shown) return;
        box.style.top = '0px';
        box.style.left = '0px';
        var size = box.getBoundingClientRect();
        var spot = placeBox(anchor.getBoundingClientRect(), { width: size.width, height: size.height }, viewport(), { align: options!.align || 'center', prefer: options!.prefer, gap: gap, margin: gap });
        box.style.top = spot.top + 'px';
        box.style.left = spot.left + 'px';
    }

    function claim(): void {
        members().forEach(function (el: Element): void {
            // A control that another component already claims keeps its claim when this popover closes.
            if (el.hasAttribute('data-base-escape')) return;
            claimEscape(el, true);
            claimed.push(el);
        });
    }

    function close(): void {
        if (!shown) return;
        shown = false;
        box.hidden = true;
        claimed.splice(0).forEach(function (el: Element): void { claimEscape(el, false); });
        runAll(openCleanups);
    }

    function dismiss(reason: PopoverDismissReason): void {
        var active = document.activeElement as HTMLElement | null;
        var inBox: boolean = !!active && box.contains(active);
        // A click on a part of the page that takes no focus leaves focus on the body, so it goes back to the anchor too.
        var lost: boolean = options!.returnFocus !== false && (inBox || (reason === 'outside' && (!active || active === document.body)));
        close();
        if (options!.onDismiss) options!.onDismiss(reason);
        if (lost && (anchor as HTMLElement).focus) (anchor as HTMLElement).focus();
    }

    function open(): void {
        if (shown) return;
        shown = true;
        gap = options!.gap === undefined ? popoverGap(anchor) : options!.gap;
        box.hidden = false;
        claim();
        place();
        if (options!.follow === 'hide') {
            openCleanups.push(listen(window, 'scroll', function (): void { dismiss('scroll'); }, true));
            openCleanups.push(listen(window, 'resize', function (): void { dismiss('resize'); }));
        } else {
            openCleanups.push(listen(window, 'scroll', place, true));
            openCleanups.push(listen(window, 'resize', place));
        }
        openCleanups.push(listen(document, 'click', function (e: MouseEvent): void {
            if (!contains(e.target as Node)) dismiss('outside');
        }));
        openCleanups.push(listen(document, 'keydown', function (e: KeyboardEvent): void {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            dismiss('escape');
        }));
    }

    return {
        open: open,
        close: close,
        place: place,
        isOpen: function (): boolean { return shown; },
        destroy: close
    };
}
