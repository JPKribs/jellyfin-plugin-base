import type { Tabs } from './types.js';

/**
 * Wires the dashboard tab bar for a config page. Call it inside viewshow with the active tab index.
 *
 * @param key string grouping the plugin's tabs
 * @param index active tab index
 * @param tabs array of { href, name }, or a function returning one that runs each time the tabs are shown
 */
export function setTabs(key: string, index: number, tabs: Tabs): void {
    if (typeof LibraryMenu !== 'undefined' && LibraryMenu.setTabs) {
        LibraryMenu.setTabs(key, index, function () { return typeof tabs === 'function' ? tabs() : tabs; });
    }
}
