import { createModalShell, dialogButtonRow, focusFirst } from './lib/dialog.js';
import type { ModalShell } from './lib/dialog.js';
import { make, nextId, clear } from './lib/dom.js';
import { makeBadge, badgeColor } from './lib/badge.js';
import type { DialogButton, DialogOptions } from './dialog.js';
import type { ComponentHandle } from './types.js';

/** What a detail drawer shows: a title, an optional subtitle and badge, the body, and the footer buttons. */
export interface DetailDrawerContent {
    title?: string;
    subtitle?: string;
    badge?: { label: string; color?: string } | null;
    body?: string | Node;
    buttons?: DialogButton[];
}

/** What openDetailDrawer takes, the content plus how it behaves as a dialog. */
export interface DetailDrawerOptions extends DetailDrawerContent, Pick<DialogOptions, 'ariaLabel' | 'size' | 'className' | 'dismissable' | 'closeButton' | 'beforeClose' | 'autofocus' | 'returnFocus' | 'onClose'> {}

/** What openDetailDrawer returns, where content is the scrolling body and setContent swaps what it shows without closing it. */
export interface DetailDrawerHandle extends ComponentHandle {
    element: HTMLDivElement;
    content: HTMLDivElement;
    close(value?: unknown): void;
    dismiss(): void;
    isOpen(): boolean;
    setTitle(text: string): void;
    setContent(next: DetailDrawerContent): void;
    destroy(): void;
}

/**
 * Opens a detail drawer, a dialog that slides in from the right edge, with a header of a title, an optional subtitle and badge, and
 * the close button in its corner, a body that scrolls, and an optional footer of buttons. Below the compact width it is a full screen
 * sheet that slides up. It closes, traps focus, locks the page scroll, and returns focus as every dialog does.
 *
 * @param opts {
 *   title       : the heading [optional]
 *   subtitle    : a line under the heading [optional]
 *   badge       : { label, color } shown beside the heading, where color is a status color name, a hex code, or a badge state name [optional]
 *   body        : HTML or a node for the body [optional]
 *   buttons     : the footer buttons, as openDialog takes them [optional]
 *   size        : 'small', 'medium', or 'large', the width from the dialog size scale (default 'medium')
 *   ariaLabel, className, dismissable, closeButton, beforeClose, autofocus, returnFocus, onClose : as openDialog [optional]
 * }
 * @returns { element, content, close, dismiss, isOpen, setTitle, setContent, destroy }. setContent swaps the title, subtitle, badge, body, and buttons in place.
 */
export function openDetailDrawer(opts?: DetailDrawerOptions): DetailDrawerHandle {
    opts = opts || {};
    var shell: ModalShell = createModalShell({
        size: opts.size,
        className: opts.className,
        dismissable: opts.dismissable,
        closeButton: opts.closeButton,
        beforeClose: opts.beforeClose,
        autofocus: opts.autofocus,
        returnFocus: opts.returnFocus,
        onClose: opts.onClose,
        overlayClass: 'base-drawer',
        contentClass: 'base-drawer-content'
    });
    var panel: HTMLDivElement = shell.content;
    var head = make('div', 'base-drawer-head');
    var heading = make('div', 'base-drawer-heading');
    var title = make('h2', 'base-modal-title base-drawer-title');
    title.id = nextId('drawer-title');
    var subtitle = make('p', 'base-drawer-subtitle');
    subtitle.id = nextId('drawer-subtitle');
    heading.appendChild(title);
    head.appendChild(heading);
    head.appendChild(subtitle);
    var body = make('div', 'base-modal-body base-drawer-body');
    var footer: HTMLDivElement | null = null;
    panel.appendChild(head);
    panel.appendChild(body);

    function setTitle(text: string): void {
        title.textContent = text || '';
        title.hidden = !text;
        if (text) {
            panel.setAttribute('aria-labelledby', title.id);
            panel.removeAttribute('aria-label');
        } else {
            panel.removeAttribute('aria-labelledby');
            panel.setAttribute('aria-label', (opts!.ariaLabel || 'Details').slice(0, 80));
        }
    }

    function setContent(next: DetailDrawerContent): void {
        next = next || {};
        var hadFocus: boolean = panel.contains(document.activeElement) && document.activeElement !== panel;
        var footerAt: number = footer ? Array.prototype.indexOf.call(footer.querySelectorAll('.base-modal-button'), document.activeElement) : -1;
        setTitle(next.title || '');
        subtitle.textContent = next.subtitle || '';
        subtitle.hidden = !next.subtitle;
        if (next.subtitle) panel.setAttribute('aria-describedby', subtitle.id);
        else panel.removeAttribute('aria-describedby');
        var oldBadge = heading.querySelector('.base-badge');
        if (oldBadge) heading.removeChild(oldBadge);
        if (next.badge && next.badge.label) heading.appendChild(makeBadge(next.badge.label, badgeColor(next.badge.color, 'gray'), null, 'base-drawer-badge'));
        clear(body);
        body.scrollTop = 0;
        if (next.body instanceof Node) body.appendChild(next.body);
        else if (typeof next.body === 'string') body.innerHTML = next.body;
        if (footer && footer.parentNode) footer.parentNode.removeChild(footer);
        footer = dialogButtonRow(next.buttons, shell.close, shell.dismiss);
        if (footer) {
            footer.classList.add('base-drawer-footer');
            panel.appendChild(footer);
        }
        // Focus that sat on content now gone stays on the same footer button, such as Next, else moves to the drawer, so Tab and Escape keep working.
        if (hadFocus && shell.isOpen() && !panel.contains(document.activeElement)) {
            var same: HTMLElement | undefined = footer && footerAt !== -1 ? footer.querySelectorAll<HTMLElement>('.base-modal-button')[footerAt] : undefined;
            if (same) same.focus();
            else focusFirst(panel, { autofocus: false });
        }
    }

    setContent(opts);
    shell.show();

    return {
        element: shell.overlay,
        content: body,
        close: shell.close,
        dismiss: shell.dismiss,
        isOpen: shell.isOpen,
        setTitle: setTitle,
        setContent: setContent,
        destroy: function (): void { shell.close(); }
    };
}

/**
 * Returns a function that shows an item in a detail drawer, for a Filtered List's or Data Table's onOpen. It opens the drawer for
 * the first item, and while that drawer is open it swaps in the next item's content without closing it.
 *
 * @param render function(item) returning the content for an item: { title, subtitle, badge, body, buttons }
 * @param opts the drawer's other options, as openDetailDrawer takes them [optional]
 * @returns function(item) that opens or updates the drawer and returns its handle
 */
export function detailDrawerOpener<T>(render: (item: T) => DetailDrawerContent, opts?: DetailDrawerOptions): (item: T) => DetailDrawerHandle {
    var current: DetailDrawerHandle | null = null;
    return function (item: T): DetailDrawerHandle {
        var content: DetailDrawerContent = render(item) || {};
        if (current && current.isOpen()) {
            current.setContent(content);
            return current;
        }
        var merged: DetailDrawerOptions = Object.assign({}, opts || {}, content);
        current = openDetailDrawer(merged);
        return current;
    };
}
