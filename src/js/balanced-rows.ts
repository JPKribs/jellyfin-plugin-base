import { balanceRows } from './lib/balance.js';
import type { BalanceHandle, BalanceOptions } from './lib/balance.js';

export { balanceRows };
export type { BalanceHandle, BalanceOptions };

/** The tile groups bindBalancedRows balances, with the least width a tile takes and the most tiles a row holds. */
var GROUPS: Array<{ selector: string; options: BalanceOptions }> = [
    { selector: '.base-cards', options: { minWidth: 110 } },
    { selector: '.base-choice-group', options: { minWidth: 200, maxColumns: 3 } },
    { selector: '.base-check-grid', options: { minWidth: 160 } }
];

/**
 * Balances every group of tiles under a root, such as count cards, choice cards, and a check grid, so a wrapped row
 * never holds a single tile. It also balances groups added later. createConfigPage runs it on every page.
 *
 * @param root the page or element to search within
 * @returns { update, destroy }
 */
export function bindBalancedRows(root: ParentNode): BalanceHandle {
    var bound: BalanceHandle[] = [];

    function scan(): void {
        GROUPS.forEach(function (group) {
            root.querySelectorAll<HTMLElement>(group.selector).forEach(function (el) {
                if (el.classList.contains('base-balanced')) return;
                bound.push(balanceRows(el, group.options));
            });
        });
    }

    var observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(scan);
        observer.observe(root as Node, { childList: true, subtree: true });
    }
    scan();

    return {
        update: function () { scan(); bound.forEach(function (b) { b.update(); }); },
        destroy: function () {
            if (observer) observer.disconnect();
            bound.splice(0).forEach(function (b) { b.destroy(); });
        }
    };
}
