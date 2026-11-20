import { make, icon, clear, listen, runAll } from './lib/dom.js';
import { bindPressedGroup } from './lib/pressed-group.js';
import { isHexColor, COLOR_NAMES, mixColors } from './lib/color.js';
import { WORLD, WORLD_VIEWBOX } from './lib/world-shapes.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** One kind of count the map can show, such as People or Failed. color is a status color name or a hex code. */
export interface WorldMapLayer {
    key: string;
    label: string;
    color?: string;
}

/** Counts by country code, and within each country by layer key, such as { US: { people: 3, failed: 1 } }. */
export type WorldMapCounts = Record<string, Record<string, number>>;

/** What createWorldMap takes. */
export interface WorldMapOptions {
    layers: WorldMapLayer[];
    counts?: WorldMapCounts;
    active?: string[];
    selected?: string | null;
    label?: string;
    onSelect?(code: string | null): void;
    onLayersChange?(active: string[]): void;
}

/** What createWorldMap returns. */
export interface WorldMapHandle extends ComponentHandle {
    setCounts(counts: WorldMapCounts): void;
    getActive(): string[];
    setActive(keys: string[]): void;
    select(code: string | null): void;
    getSelected(): string | null;
    onSelect(listener: (code: string | null) => void): () => void;
    totals(): Record<string, number>;
    countryName(code: string): string;
    destroy(): void;
}

var SVG_NS = 'http://www.w3.org/2000/svg';

/** The most layers a map shows: one per default color. */
var MAX_LAYERS = 6;

/** The colors layers take when they name none: the paint primaries blue, yellow, and red, then the secondaries green, orange, and purple. */
var DEFAULT_COLORS = ['blue', 'yellow', 'red', 'green', 'orange', 'purple'];

// The CSS color a layer draws in: a status color's token, or a hex code.
function layerColor(color: string | undefined): string {
    if (isHexColor(color)) return color.trim();
    if (color && COLOR_NAMES.indexOf(color) !== -1) return 'var(--base-' + color + '-fg)';
    return 'var(--base-accent)';
}

/**
 * A world map that shades each country by its counts, with a toggle button per layer in its header that is clearly on
 * or off. It shows up to six layers. A layer takes the color it names, and one that names none takes the next default: the paint primaries blue, yellow, and red, then the secondaries green, orange, and purple. Only the
 * layers that are on count. A country's color mixes the colors of its layers as paint does, by each layer's share of its
 * count, so a country with red and yellow counts is orange, and its strength follows its total. A click or Enter on a country selects it, and again clears it, and onSelect reports it, so a table
 * can filter by country. select(code) highlights a country picked elsewhere, such as a table row.
 *
 * @param options {
 *   layers         : up to six { key, label, color } where color is a status color name or a hex code (default blue, yellow, red, green, orange, purple in order) [required]
 *   counts         : { CODE: { layerKey: count } } by ISO 3166 alpha-2 code [optional]
 *   active         : the layer keys that start on (default all)
 *   selected       : the country code that starts selected [optional]
 *   label          : aria-label of the map (default 'World map')
 *   onSelect       : function(code) with the selected code, or null when the selection clears [optional]
 *   onLayersChange : function(activeKeys) after a layer button turns on or off [optional]
 * }
 * @returns { element, setCounts, getActive, setActive, select, getSelected, onSelect, totals, countryName, destroy }. onSelect(listener) adds a listener beside the option and returns a function that removes it. totals gives each country's count over the layers that are on.
 */
export function createWorldMap(options: WorldMapOptions): WorldMapHandle {
    var opts = options || ({ layers: [] } as WorldMapOptions);
    // Up to six layers, each with its own color or the default for its place.
    var layers = (opts.layers || []).slice(0, MAX_LAYERS).map(function (l, i) {
        return { key: l.key, label: l.label, color: l.color || DEFAULT_COLORS[i] };
    });
    var counts: WorldMapCounts = opts.counts || {};
    var active: string[] = opts.active ? opts.active.slice() : layers.map(function (l) { return l.key; });
    var selected: string | null = opts.selected || null;
    var cleanups: Array<() => void> = [];
    var paths: Record<string, SVGPathElement> = {};
    var titles: Record<string, SVGTitleElement> = {};
    var listeners: Array<(code: string | null) => void> = [];

    var root = make('div', 'base-world-map');
    var header = make('div', 'base-world-layers', { role: 'group', 'aria-label': baseText('Base.Layers') });
    layers.forEach(function (layer) {
        var button = make('button', 'raised base-button small base-world-layer', { type: 'button', 'data-value': layer.key, 'aria-pressed': active.indexOf(layer.key) !== -1 ? 'true' : 'false' });
        button.style.setProperty('--base-layer', layerColor(layer.color));
        button.appendChild(icon('check'));
        button.appendChild(make('span', 'base-world-layer-dot', { 'aria-hidden': 'true' }));
        button.appendChild(make('span', '', null, layer.label));
        header.appendChild(button);
    });
    if (layers.length > 1) root.appendChild(header);

    var frame = make('div', 'base-world-frame');
    var svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    svg.setAttribute('viewBox', WORLD_VIEWBOX);
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', opts.label || baseText('Base.WorldMap'));
    Object.keys(WORLD).forEach(function (code) {
        var path = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
        path.setAttribute('d', WORLD[code].d);
        path.setAttribute('class', 'base-world-country');
        path.setAttribute('data-code', code);
        var title = document.createElementNS(SVG_NS, 'title') as SVGTitleElement;
        path.appendChild(title);
        svg.appendChild(path);
        paths[code] = path;
        titles[code] = title;
    });
    frame.appendChild(svg);
    root.appendChild(frame);


    function totalOf(code: string): number {
        var c = counts[code];
        if (!c) return 0;
        return active.reduce(function (sum, key) { return sum + (Number(c[key]) || 0); }, 0);
    }

    function totals(): Record<string, number> {
        var out: Record<string, number> = {};
        Object.keys(counts).forEach(function (code) { var t = totalOf(code); if (t > 0) out[code] = t; });
        return out;
    }

    // The layers that are on, mixed as paint by their share of the country's count, so red and yellow make orange.
    function fillOf(code: string): string {
        var c = counts[code] || {};
        var parts = layers.filter(function (l) { return active.indexOf(l.key) !== -1 && Number(c[l.key]) > 0; })
            .map(function (l) { return { color: l.color, weight: Number(c[l.key]) }; });
        if (parts.length === 1) return layerColor(parts[0].color);
        return mixColors(parts, root) || 'var(--base-accent)';
    }

    function describe(code: string, total: number): string {
        var name = WORLD[code] ? WORLD[code].name : code;
        var c = counts[code] || {};
        var parts = layers.filter(function (l) { return active.indexOf(l.key) !== -1 && Number(c[l.key]) > 0; })
            .map(function (l) { return l.label + ' ' + c[l.key]; });
        return name + ', ' + total + (parts.length > 1 ? ' (' + parts.join(', ') + ')' : '');
    }

    // Shades every country, marks the selection, and makes the countries with a count reachable by keyboard.
    function draw(): void {
        var all = totals();
        var max = Object.keys(all).reduce(function (m, k) { return Math.max(m, all[k]); }, 0);
        Object.keys(paths).forEach(function (code) {
            var path = paths[code];
            var total = all[code] || 0;
            var name = WORLD[code].name;
            path.classList.toggle('counted', total > 0);
            path.classList.toggle('selected', code === selected);
            if (total > 0) {
                // A log scale, so one busy country does not wash out the rest.
                var level = max > 0 ? 0.25 + 0.75 * Math.log(1 + total) / Math.log(1 + max) : 0;
                path.style.setProperty('fill-opacity', level.toFixed(3));
                path.style.setProperty('--base-world-fill', fillOf(code));
                path.setAttribute('tabindex', '0');
                path.setAttribute('role', 'button');
                path.setAttribute('aria-pressed', code === selected ? 'true' : 'false');
                path.setAttribute('aria-label', describe(code, total));
                titles[code].textContent = describe(code, total);
            } else {
                path.style.removeProperty('fill-opacity');
                path.style.removeProperty('--base-world-fill');
                path.removeAttribute('tabindex');
                path.removeAttribute('role');
                path.removeAttribute('aria-pressed');
                path.removeAttribute('aria-label');
                titles[code].textContent = name;
            }
        });
        // The selected country is drawn last, so its outline is never covered by a neighbor.
        if (selected && paths[selected]) svg.appendChild(paths[selected]);
    }

    function select(code: string | null, report: boolean): void {
        var next = code && paths[code] ? code : null;
        if (next === selected) return;
        selected = next;
        draw();
        if (report) {
            if (opts.onSelect) opts.onSelect(selected);
            listeners.slice().forEach(function (fn) { fn(selected); });
        }
    }

    // A click or Enter on a counted country selects it, and again clears it.
    function pick(target: EventTarget | null): void {
        var el = target as Element | null;
        while (el && el !== (svg as Element) && !(el.getAttribute && el.getAttribute('data-code'))) el = el.parentNode as Element | null;
        var code = el && el.getAttribute ? el.getAttribute('data-code') : null;
        if (!code || !(totalOf(code) > 0)) return;
        select(code === selected ? null : code, true);
    }
    cleanups.push(listen(svg, 'click', function (e: Event) { pick(e.target); }));
    cleanups.push(listen(svg, 'keydown', function (e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e.target); }
        else if (e.key === 'Escape' && selected) select(null, true);
    }));

    var group = bindPressedGroup(header, {
        selector: '.base-world-layer',
        multiple: true,
        onChange: function (values) {
            active = values.filter(function (v): v is string { return v !== null; });
            draw();
            if (opts.onLayersChange) opts.onLayersChange(active.slice());
        }
    });
    cleanups.push(function () { group.destroy(); });

    draw();

    return {
        element: root,
        setCounts: function (next) { counts = next || {}; draw(); },
        getActive: function () { return active.slice(); },
        setActive: function (keys) { active = (keys || []).slice(); group.setValues(active); draw(); },
        select: function (code) { select(code, false); },
        getSelected: function () { return selected; },
        onSelect: function (listener) {
            listeners.push(listener);
            return function () { listeners = listeners.filter(function (fn) { return fn !== listener; }); };
        },
        totals: totals,
        countryName: function (code) { return WORLD[code] ? WORLD[code].name : code; },
        destroy: function () { runAll(cleanups); clear(root); }
    };
}

/** A table the map can follow: it reports a selected row, selects rows from code, and can filter by a field, as createDataTable does. */
export interface WorldMapTable {
    setFilter?(name: string, values: string[] | null | undefined): void;
    onSelect(listener: (row: any, key: string | null) => void): () => void;
    select?(key: unknown): void;
    setSelectedKeys?(keys: unknown[] | null | undefined): void;
    clearSelection?(): void;
    getState?(): { items: any[] };
}

/** How linkWorldMap joins the two. field holds the country code, rowKey names a row, as the table's rowKey does, and filter true also narrows the table to the picked country. */
export interface WorldMapLinkOptions {
    field?: string;
    rowKey?: string;
    filter?: boolean;
}

/**
 * Joins a world map to a table both ways, so a selection on either one is the selection on both. A country picked on
 * the map selects its rows and keeps every other row in view, and clearing it clears both. A row picked in the table
 * highlights its country on the map, and clearing the row clears the map. With filter true, a country picked on the map
 * also narrows the table to that country, and clearing either side lifts the filter.
 *
 * @param map the world map
 * @param table a data table, with a filter on the country field when filter is true
 * @param options the field that holds the country code (default 'country'), rowKey, the row field that names a row (default the same field), and filter, true to narrow the table to the picked country (default false), or the field name alone
 * @returns a function that unlinks them
 */
export function linkWorldMap(map: WorldMapHandle, table: WorldMapTable, options?: string | WorldMapLinkOptions): () => void {
    var opts: WorldMapLinkOptions = typeof options === 'string' ? { field: options } : (options || {});
    var name = opts.field || 'country';
    var rowKey = opts.rowKey || name;
    var filter = !!opts.filter && !!table.setFilter;
    // Each side changes the other quietly, so a change made here never comes back as a new pick.
    var busy = false;

    function selectRows(code: string | null): void {
        if (!code) {
            if (table.clearSelection) table.clearSelection();
            else if (table.select) table.select(null);
            return;
        }
        var rows = table.getState ? table.getState().items : [];
        var keys = rows.filter(function (row) { return String(row[name]).toUpperCase() === code; }).map(function (row) { return row[rowKey]; });
        if (table.setSelectedKeys) table.setSelectedKeys(keys.length ? keys : [code]);
        else if (table.select) table.select(keys.length ? keys[0] : code);
    }

    var offMap = map.onSelect(function (code) {
        if (busy) return;
        busy = true;
        if (filter) table.setFilter!(name, code ? [code] : []);
        selectRows(code);
        busy = false;
    });
    var offTable = table.onSelect(function (row) {
        if (busy) return;
        busy = true;
        var code = row ? String(row[name]).toUpperCase() : null;
        map.select(code);
        // Clearing the row lifts the country filter too, so the table shows every country again.
        if (!code && filter) table.setFilter!(name, []);
        busy = false;
    });
    return function () { offMap(); offTable(); };
}
