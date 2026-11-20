import { make, icon, listen, runAll, fill, toText } from './lib/dom.js';
import { makeCheck } from './lib/check.js';
import { createSelection } from './lib/selection.js';
import { buildThumb, SHAPE_ICONS } from './lib/thumb.js';
import type { ThumbShape } from './lib/thumb.js';
import { setCollapsed } from './collapsible-section.js';
import { createList, fillRowParts } from './list.js';
import type { ListHeight, ListItemHandle } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** One node of the tree. children are known children, and hasChildren marks a node whose children loadChildren fetches when it opens. image is a thumbnail address. */
export interface TreeNode {
    id: unknown;
    label: string;
    secondary?: string | null;
    icon?: string;
    image?: string | null;
    imageShape?: ThumbShape;
    children?: TreeNode[] | null;
    hasChildren?: boolean;
}

/** What createTreeView takes. selectable draws a checkbox on each node, and a parent shows checked, partly checked, or clear from its children. */
export interface TreeViewOptions {
    nodes?: TreeNode[] | null;
    loadChildren?(node: TreeNode): Promise<TreeNode[]> | TreeNode[];
    selectable?: boolean;
    value?: unknown[] | null;
    expanded?: unknown[] | null;
    label?: string;
    emptyText?: string;
    loadingText?: string;
    expandLabel?: string;
    collapseLabel?: string;
    selectLabel?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    onChange?(ids: string[]): void;
    onOpen?(node: TreeNode): void;
}

/** What createTreeView returns. expand resolves once the node's children show. */
export interface TreeViewHandle extends ComponentHandle {
    getValue(): string[];
    setValue(ids: unknown[] | null): void;
    setNodes(nodes: TreeNode[] | null): void;
    expand(id: unknown): Promise<void>;
    collapse(id: unknown): void;
    destroy(): void;
}

// TreeEntry
// What the tree knows of one node: its parent, its depth, its loaded children, and whether it is open or loading.
interface TreeEntry {
    node: TreeNode;
    id: string;
    parent: string | null;
    level: number;
    children: string[] | null;
    expanded: boolean;
    loading: boolean;
}

// TreeRow
// One visible row, as plain data, so the List draws again only the rows whose state changed.
interface TreeRow {
    id: string;
    level: number;
    pos: number;
    size: number;
    expandable: boolean;
    expanded: boolean;
    loading: boolean;
    state: 'on' | 'off' | 'mixed';
    active: boolean;
}

/**
 * Nested rows that open and close, on a List with the collapsible pattern. Children can load when a node opens, through
 * a promise. With selectable each node has a checkbox through the selection core, and a parent is checked, partly
 * checked, or clear from its children. Arrow keys move and open, Enter opens, Space checks, and a node can show a
 * thumbnail through the thumb core.
 *
 * @param options {
 *   nodes        : array of { id, label, secondary, icon, image, imageShape, children, hasChildren } [optional]
 *   loadChildren : function(node) returning the node's children, or a promise of them, when a node with hasChildren opens [optional]
 *   selectable   : true draws a checkbox on each node (default false)
 *   value        : the ids that start checked [optional]
 *   expanded     : the ids that start open [optional]
 *   label        : aria-label of the tree (default 'Tree')
 *   emptyText    : shown while there is no node (default 'Nothing to show.')
 *   loadingText  : shown on a node while its children load (default 'Loading')
 *   expandLabel, collapseLabel : aria-labels of a node's open button, where {value} is its label (default 'Expand {value}' and 'Collapse {value}')
 *   selectLabel  : aria-label of a checkbox, where {value} is the label (default 'Select {value}')
 *   height, maxHeight, minHeight : the List's height (default 'auto')
 *   onChange     : function(ids) after the checked ids change [optional]
 *   onOpen       : function(node) when a node is clicked or gets Enter [optional]
 * }
 * @returns { element, getValue, setValue, setNodes, expand, collapse, destroy }. getValue gives the checked ids, a parent included when all its loaded children are checked.
 */
export function createTreeView(options?: TreeViewOptions): TreeViewHandle {
    var opts = options || {};
    var entries: Record<string, TreeEntry> = Object.create(null);
    var roots: string[] = [];
    var active = '';
    var cleanups: Array<() => void> = [];
    var opened = (opts.expanded || []).map(toText);
    var selection = createSelection({ ids: opts.value });

    function add(nodes: TreeNode[], parent: string | null, level: number): string[] {
        return (nodes || []).filter(function (n) { return n && n.id !== undefined && n.id !== null; }).map(function (n) {
            var id = toText(n.id);
            var entry: TreeEntry = { node: n, id: id, parent: parent, level: level, children: null, expanded: opened.indexOf(id) !== -1, loading: false };
            entries[id] = entry;
            if (Array.isArray(n.children)) entry.children = add(n.children, id, level + 1);
            return id;
        });
    }

    function expandable(e: TreeEntry): boolean {
        return e.children ? e.children.length > 0 : !!e.node.hasChildren;
    }

    function stateOf(id: string): 'on' | 'off' | 'mixed' {
        var e = entries[id];
        if (!e.children || !e.children.length) return selection.has(id) ? 'on' : 'off';
        var states = e.children.map(stateOf);
        if (states.every(function (s) { return s === 'on'; })) return 'on';
        if (states.every(function (s) { return s === 'off'; })) return 'off';
        return 'mixed';
    }

    // Sets a node and every loaded node under it, without onChange.
    function setSubtree(id: string, on: boolean, ids: string[]): void {
        var at = ids.indexOf(id);
        if (on && at === -1) ids.push(id);
        if (!on && at !== -1) ids.splice(at, 1);
        var e = entries[id];
        if (e.children) e.children.forEach(function (c) { setSubtree(c, on, ids); });
    }

    // Keeps each parent with loaded children in the selection exactly when all of them are checked.
    function normalize(): void {
        var ids = selection.getIds();
        Object.keys(entries).forEach(function (id) {
            var e = entries[id];
            if (!e.children || !e.children.length) return;
            var on = stateOf(id) === 'on';
            var at = ids.indexOf(id);
            if (on && at === -1) ids.push(id);
            if (!on && at !== -1) ids.splice(at, 1);
        });
        selection.setIds(ids);
    }

    // A checked parent checks every loaded node under it, so a value may name a parent alone.
    function spread(): void {
        var ids = selection.getIds();
        ids.slice().forEach(function (id) { if (entries[id]) setSubtree(id, true, ids); });
        selection.setIds(ids);
        normalize();
    }

    function visible(): TreeRow[] {
        var out: TreeRow[] = [];
        function walk(ids: string[]): void {
            ids.forEach(function (id, i) {
                var e = entries[id];
                out.push({ id: id, level: e.level, pos: i + 1, size: ids.length, expandable: expandable(e), expanded: e.expanded && expandable(e), loading: e.loading, state: opts.selectable ? stateOf(id) : 'off', active: false });
                if (e.expanded && e.children) walk(e.children);
            });
        }
        walk(roots);
        if (out.length && !out.some(function (r) { return r.id === active; })) active = out[0].id;
        out.forEach(function (r) { r.active = r.id === active; });
        return out;
    }

    function row(r: TreeRow): ListItemHandle {
        var e = entries[r.id];
        var n = e.node;
        var el = make('div', 'base-tree-row' + (r.state === 'on' ? ' selected' : ''), { role: 'treeitem', 'data-id': r.id, 'aria-level': String(r.level + 1), 'aria-posinset': String(r.pos), 'aria-setsize': String(r.size), tabindex: r.active ? '0' : '-1' });
        el.style.setProperty('--base-tree-level', String(r.level));
        if (opts.selectable) el.setAttribute('aria-checked', r.state === 'on' ? 'true' : r.state === 'mixed' ? 'mixed' : 'false');
        var thumbs: Array<{ destroy(): void }> = [];
        if (r.expandable) {
            var toggle = make('button', 'base-tree-toggle', { type: 'button', tabindex: '-1' });
            var glyph = icon('expand_more');
            glyph.classList.add('base-collapsible-icon');
            toggle.appendChild(glyph);
            var name = fill(r.expanded ? (opts.collapseLabel || baseText('Base.CollapseValue')) : (opts.expandLabel || baseText('Base.ExpandValue')), n.label);
            toggle.setAttribute('aria-label', name);
            toggle.title = name;
            setCollapsed(toggle, null, !r.expanded);
            el.setAttribute('aria-expanded', r.expanded ? 'true' : 'false');
            el.appendChild(toggle);
        } else {
            el.appendChild(make('span', 'base-tree-spacer', { 'aria-hidden': 'true' }));
        }
        if (opts.selectable) {
            var box = makeCheck('base-tree-check', { tabindex: '-1', 'aria-label': fill(opts.selectLabel || baseText('Base.SelectValue'), n.label) });
            box.checked = r.state === 'on';
            box.indeterminate = r.state === 'mixed';
            el.appendChild(box);
        }
        if (n.image !== undefined && n.image !== null) {
            var shape: ThumbShape = n.imageShape || 'square';
            var thumb = buildThumb({ src: n.image, icon: n.icon || SHAPE_ICONS[shape], className: 'base-tree-thumb ' + shape, lazy: true });
            thumbs.push(thumb);
            el.appendChild(thumb.element);
        } else if (n.icon) {
            var mark = icon(n.icon);
            mark.classList.add('base-tree-icon');
            el.appendChild(mark);
        }
        var text = make('span', 'base-tree-text');
        fillRowParts(text, { primary: toText(n.label), secondary: n.secondary || null });
        el.appendChild(text);
        if (r.loading) el.appendChild(make('span', 'base-tree-loading', { role: 'status' }, opts.loadingText || baseText('Base.Loading')));
        return { element: el, destroy: function () { thumbs.forEach(function (t) { t.destroy(); }); } };
    }

    var list = createList<TreeRow>({
        layout: 'plain',
        role: 'tree',
        wrap: false,
        key: 'id',
        label: opts.label || baseText('Base.Tree'),
        emptyText: opts.emptyText || baseText('Base.NothingToShow'),
        height: opts.height,
        maxHeight: opts.maxHeight,
        minHeight: opts.minHeight,
        render: row
    });
    var root = list.element;
    root.classList.add('base-tree');
    if (opts.selectable) root.setAttribute('aria-multiselectable', 'true');

    function draw(): void { list.setItems(visible()); }

    function focusRow(id: string): void {
        active = id;
        draw();
        var el = root.querySelector<HTMLElement>('[data-id="' + id.replace(/"/g, '\\"') + '"]');
        if (el) el.focus();
    }

    function emit(): void { if (opts.onChange) opts.onChange(selection.getIds()); }

    function toggleCheck(id: string): void {
        var ids = selection.getIds();
        setSubtree(id, stateOf(id) !== 'on', ids);
        selection.setIds(ids);
        normalize();
        draw();
        emit();
    }

    function expand(raw: unknown): Promise<void> {
        var e = entries[toText(raw)];
        if (!e || !expandable(e)) return Promise.resolve();
        e.expanded = true;
        if (e.children || !opts.loadChildren) { draw(); return Promise.resolve(); }
        if (e.loading) return Promise.resolve();
        e.loading = true;
        draw();
        var got: Promise<TreeNode[]> | TreeNode[];
        try { got = opts.loadChildren(e.node); } catch (err) { got = Promise.reject(err); }
        return Promise.resolve(got).then(function (kids) {
            e.loading = false;
            e.children = add(Array.isArray(kids) ? kids : [], e.id, e.level + 1);
            // Children that load under a checked node start checked.
            if (opts.selectable && selection.has(e.id)) {
                var ids = selection.getIds();
                setSubtree(e.id, true, ids);
                selection.setIds(ids);
            }
            normalize();
            draw();
        }, function () {
            e.loading = false;
            e.expanded = false;
            draw();
        });
    }

    function collapse(raw: unknown): void {
        var e = entries[toText(raw)];
        if (!e) return;
        e.expanded = false;
        draw();
    }

    function rowOf(target: EventTarget | null): HTMLElement | null {
        var el = target as HTMLElement | null;
        return el && el.closest ? el.closest<HTMLElement>('.base-tree-row') : null;
    }

    cleanups.push(listen(root, 'click', function (ev: MouseEvent) {
        var el = rowOf(ev.target);
        if (!el) return;
        var id = toText(el.getAttribute('data-id'));
        var target = ev.target as HTMLElement;
        active = id;
        if (target.closest && target.closest('.base-tree-toggle')) {
            if (entries[id].expanded) collapse(id);
            else expand(id);
            return;
        }
        if (target.classList && target.classList.contains('base-tree-check')) return;
        if (opts.onOpen) opts.onOpen(entries[id].node);
        else if (expandable(entries[id])) {
            if (entries[id].expanded) collapse(id);
            else expand(id);
        } else if (opts.selectable) toggleCheck(id);
    }));
    cleanups.push(listen(root, 'change', function (ev: Event) {
        var target = ev.target as HTMLElement;
        if (!target.classList || !target.classList.contains('base-tree-check')) return;
        var el = rowOf(target);
        if (el) toggleCheck(toText(el.getAttribute('data-id')));
    }));
    cleanups.push(listen(root, 'keydown', function (ev: KeyboardEvent) {
        var el = rowOf(ev.target);
        if (!el || ev.target !== el) return;
        var id = toText(el.getAttribute('data-id'));
        var rows = visible();
        var at = rows.map(function (r) { return r.id; }).indexOf(id);
        var e = entries[id];
        var handled = true;
        if (ev.key === 'ArrowDown') { if (rows[at + 1]) focusRow(rows[at + 1].id); }
        else if (ev.key === 'ArrowUp') { if (rows[at - 1]) focusRow(rows[at - 1].id); }
        else if (ev.key === 'Home') { if (rows.length) focusRow(rows[0].id); }
        else if (ev.key === 'End') { if (rows.length) focusRow(rows[rows.length - 1].id); }
        else if (ev.key === 'ArrowRight') {
            if (expandable(e) && !e.expanded) expand(id).then(function () { focusRow(id); });
            else if (e.expanded && e.children && e.children.length) focusRow(e.children[0]);
        } else if (ev.key === 'ArrowLeft') {
            if (e.expanded) { collapse(id); focusRow(id); }
            else if (e.parent) focusRow(e.parent);
        } else if (ev.key === ' ') {
            if (opts.selectable) { toggleCheck(id); focusRow(id); }
        } else if (ev.key === 'Enter') {
            if (opts.onOpen) opts.onOpen(e.node);
            else if (expandable(e)) { if (e.expanded) { collapse(id); focusRow(id); } else expand(id).then(function () { focusRow(id); }); }
        } else handled = false;
        if (handled) ev.preventDefault();
    }));

    function setNodes(nodes: TreeNode[] | null | undefined): void {
        Object.keys(entries).forEach(function (id) { if (entries[id].expanded) opened.push(id); });
        entries = Object.create(null);
        roots = add(nodes || [], null, 0);
        spread();
        draw();
    }

    setNodes(opts.nodes);

    return {
        element: root,
        getValue: function () { return selection.getIds(); },
        setValue: function (ids) { selection.setIds(ids); spread(); draw(); },
        setNodes: setNodes,
        expand: expand,
        collapse: collapse,
        destroy: function () { runAll(cleanups); list.destroy(); }
    };
}
