import { make, clear, listen, runAll, nextId } from './lib/dom.js';
import { applyColor } from './lib/color.js';
import type { ComponentHandle } from './types.js';

/** The node in the middle of a flow diagram. title is its tooltip (default the label). */
export interface FlowDiagramHub {
    label: string;
    title?: string;
}

/** One pill in a lane. status is a status color name or a hex code for its dot, and no status draws no dot. */
export interface FlowDiagramItem {
    label: string;
    title?: string;
    status?: string;
    id?: string | number;
}

/** One lane of pills on a side of the hub. direction 'in' points the arrows at the hub, 'out' at the pills, and 'both' at both. */
export interface FlowDiagramLane {
    key: string;
    side: 'left' | 'right' | 'below';
    direction: 'in' | 'out' | 'both';
    color?: string;
    label?: string;
    items: FlowDiagramItem[];
}

/** What a flow diagram draws, as setValue takes it and getValue returns it. */
export interface FlowDiagramValue {
    hub: FlowDiagramHub;
    lanes: FlowDiagramLane[];
}

/** What createFlowDiagram takes. onSelect makes each pill a button. */
export interface FlowDiagramOptions {
    hub?: FlowDiagramHub;
    lanes?: FlowDiagramLane[];
    maxLabel?: number;
    label?: string;
    onSelect?: (item: FlowDiagramItem, lane: FlowDiagramLane) => void;
}

/** What createFlowDiagram returns. */
export interface FlowDiagramHandle extends ComponentHandle {
    getValue(): FlowDiagramValue;
    setValue(next: FlowDiagramValue): void;
    destroy(): void;
}

var SVG_NS = 'http://www.w3.org/2000/svg';
var PILL_H = 26;
var PILL_GAP = 8;
var REACH = 46;
var STUB = 22;
var SIDE_ROWS = 8;
var BELOW_COLS = 4;
var HUB_H = 46;
var HUB_MIN_W = 92;
var HUB_CHAR = 7.4;
var PILL_CHAR = 6.9;
var PAD = 6;

// Builds an SVG element with a class and attributes.
function svgEl(tag: string, className?: string | null, attrs?: Record<string, string | number> | null): SVGElement {
    var el = document.createElementNS(SVG_NS, tag) as SVGElement;
    if (className) el.setAttribute('class', className);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
}

function fixed(n: number): string {
    return n.toFixed(1);
}

/**
 * Cuts a label to a length, ending it with an ellipsis when it is longer.
 * Internal to the web components.
 *
 * @param text the label
 * @param max the most characters shown, the ellipsis included
 * @returns the label as drawn
 */
export function shortLabel(text: string, max: number): string {
    return text.length > max ? text.substring(0, Math.max(1, max - 1)) + '…' : text;
}

/**
 * Where an overflow column or row starts. It sits centered in the gaps of the first, and one place over either way when
 * one of its lines would land on the line through the middle. When both ways still would, it stays centered.
 * Internal to the web components.
 *
 * @param firstOfFull where the first pill of the full column or row sits
 * @param pitch the distance from one pill to the next
 * @param full how many pills the full column or row holds
 * @param count how many pills the overflow holds
 * @returns where the first overflow pill sits
 */
export function overflowStart(firstOfFull: number, pitch: number, full: number, count: number): number {
    var skip = Math.max(0, Math.floor((full - 1 - count) / 2));
    var start = firstOfFull + pitch / 2 + skip * pitch;
    var over = skip > 0 ? -pitch : pitch;
    var tries = [start, start + over, start - over];
    for (var t = 0; t < tries.length; t++) {
        var free = true;
        for (var n = 0; n < count; n++) if (Math.abs(tries[t] + n * pitch) < 1) free = false;
        if (free) return tries[t];
    }
    return start;
}

/**
 * A hub in the middle with lanes of pills on its left, right, and below, each pill joined to the hub by a line in the
 * lane's color with arrows that show the way things travel. A lane past one pill per row or column wraps into a second,
 * offset into the gaps of the first, and the hub stays centered.
 *
 * @param options {
 *   hub      : { label, title } for the node in the middle
 *   lanes    : array of { key, side, direction, color, label, items } where side is 'left', 'right', or 'below', direction is 'in', 'out', or 'both', color is a status color name or a hex code (default 'gray'), label names the lane in the accessible name, and items is an array of { label, title, status, id }. An empty lane is not drawn, and each side draws its first lane only
 *   maxLabel : characters of a label before it ends in an ellipsis (default 18) [optional]
 *   label    : text the accessible name starts with [optional]
 *   onSelect : called with (item, lane) when a pill is clicked or pressed with Enter or Space, which makes each pill a button [optional]
 * }
 * @returns { element, getValue, setValue, destroy }. The picture is drawn at its own size when it fits its box. When it
 * does not, it is drawn again as a stack at full size, the hub on top and each lane a list under it, and it switches back
 * as the box widens.
 */
export function createFlowDiagram(options?: FlowDiagramOptions): FlowDiagramHandle {
    options = options || {};
    var maxLabel = options.maxLabel && options.maxLabel > 1 ? Math.floor(options.maxLabel) : 18;
    var onSelect = options.onSelect;
    var root = make('div', 'base-flow-diagram', { role: onSelect ? 'group' : 'img' });
    var value: FlowDiagramValue = { hub: { label: '' }, lanes: [] };
    var targets: Array<{ item: FlowDiagramItem; lane: FlowDiagramLane }> = [];
    var stops: Array<() => void> = [];

    function laneText(item: FlowDiagramItem, lane: FlowDiagramLane): string {
        return lane.label ? item.label + ', ' + lane.label : item.label;
    }

    function draw(): void {
        clear(root);
        targets = [];
        var hub = value.hub || { label: '' };
        var hubText = shortLabel(String(hub.label || ''), maxLabel);
        var hubW = Math.max(HUB_MIN_W, hubText.length * HUB_CHAR + 32);
        var bounds: number[][] = [[-hubW / 2, -HUB_H / 2], [hubW / 2, HUB_H / 2]];
        var names: string[] = [];
        if (options!.label) names.push(options!.label);
        if (hub.label) names.push(hub.label);

        var taken: Record<string, boolean> = {};
        var lanes = (value.lanes || []).filter(function (lane) {
            if (!lane || !lane.items || !lane.items.length) return false;
            var side = lane.side === 'left' || lane.side === 'below' ? lane.side : 'right';
            if (taken[side]) return false;
            taken[side] = true;
            return true;
        });
        lanes.forEach(function (lane) {
            lane.items.forEach(function (item) { names.push(lane.label ? item.label + ' ' + lane.label : item.label); });
        });

        var svg = svgEl('svg', null, { focusable: 'false' });
        var laneGroups: SVGElement[] = [];
        var sideBottom = HUB_H / 2;

        // Side lanes go first, so the lane below starts under the taller of them.
        lanes.slice().sort(function (a, b) { return Number(a.side === 'below') - Number(b.side === 'below'); }).forEach(function (lane) {
            var group = svgEl('g', 'base-flow-diagram-lane', { 'data-key': lane.key });
            applyColor(group as unknown as HTMLElement, lane.color, 'gray');
            var arrowId = nextId('flow-arrow');
            var marker = svgEl('marker', null, { id: arrowId, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' });
            marker.appendChild(svgEl('path', 'base-flow-diagram-arrow', { d: 'M2 1L8 5L2 9' }));
            group.appendChild(marker);
            var lines = svgEl('g');
            var pills = svgEl('g');
            group.appendChild(lines);
            group.appendChild(pills);
            laneGroups.push(group);

            var toHub = lane.direction === 'in' || lane.direction === 'both';
            var toPill = lane.direction !== 'in';
            var hasDot = lane.items.some(function (item) { return !!item.status; });
            var longest = Math.max.apply(null, lane.items.map(function (item) { return Math.min(String(item.label || '').length, maxLabel); }));
            var w = longest * PILL_CHAR + (hasDot ? 38 : 24);
            var pitch = PILL_H + PILL_GAP;

            function line(part: string, d: string, arrow: boolean): void {
                var path = svgEl('path', 'base-flow-diagram-line ' + part, { d: d });
                if (arrow) path.setAttribute('marker-end', 'url(#' + arrowId + ')');
                lines.appendChild(path);
            }

            function pill(item: FlowDiagramItem, x: number, y: number): void {
                var g = svgEl('g', 'base-flow-diagram-item');
                var title = svgEl('title');
                title.textContent = item.title || laneText(item, lane);
                g.appendChild(title);
                g.appendChild(svgEl('rect', 'base-flow-diagram-pill', { x: fixed(x), y: fixed(y), width: fixed(w), height: PILL_H, rx: 6 }));
                if (item.status) {
                    var dot = svgEl('circle', 'base-flow-diagram-dot', { cx: fixed(x + 14), cy: fixed(y + PILL_H / 2), r: 4 });
                    applyColor(dot as unknown as HTMLElement, item.status, 'gray');
                    g.appendChild(dot);
                }
                var text = svgEl('text', 'base-flow-diagram-label', { x: fixed(x + (hasDot ? 25 : 12)), y: fixed(y + PILL_H / 2), 'dominant-baseline': 'central' });
                text.textContent = shortLabel(String(item.label || ''), maxLabel);
                g.appendChild(text);
                if (onSelect) {
                    g.setAttribute('role', 'button');
                    g.setAttribute('tabindex', '0');
                    g.setAttribute('aria-label', laneText(item, lane));
                    g.setAttribute('data-index', String(targets.length));
                    targets.push({ item: item, lane: lane });
                }
                pills.appendChild(g);
                bounds.push([x, y], [x + w, y + PILL_H]);
            }

            var list = lane.items;
            if (lane.side === 'below') {
                // A second row sits half a pill across, so its lines drop through the gaps of the row above. A third could not.
                var step = w + 12;
                var busY = sideBottom + REACH * 0.6;
                var perRow = Math.max(BELOW_COLS, Math.ceil(list.length / 2));
                var widest = Math.min(list.length, perRow);
                var xs: number[] = [];
                for (var r = 0; r * perRow < list.length; r++) {
                    var row = list.slice(r * perRow, (r + 1) * perRow);
                    var top = busY + STUB + r * pitch;
                    var first = r % 2 ? overflowStart(-((widest - 1) * step) / 2, step, widest, row.length) : -((widest - 1) * step) / 2;
                    row.forEach(function (item, c) {
                        var cx = first + c * step;
                        xs.push(cx);
                        pill(item, cx - w / 2, top);
                        if (toPill) line('base-flow-diagram-stub', 'M' + fixed(cx) + ' ' + fixed(busY) + ' V' + fixed(top - 3), true);
                        else line('base-flow-diagram-stub', 'M' + fixed(cx) + ' ' + fixed(top - 3) + ' V' + fixed(busY), false);
                    });
                }
                line('base-flow-diagram-trunk', 'M' + fixed(Math.min.apply(null, xs.concat([0]))) + ' ' + fixed(busY) + ' H' + fixed(Math.max.apply(null, xs.concat([0]))), false);
                if (toHub) line('base-flow-diagram-join', 'M0 ' + fixed(busY) + ' V' + fixed(HUB_H / 2 + 3), true);
                else line('base-flow-diagram-join', 'M0 ' + fixed(HUB_H / 2 + 3) + ' V' + fixed(busY), false);
                return;
            }

            // A second column sits half a pill down, so its lines run through the gaps of the first. A third could not.
            var dir = lane.side === 'left' ? -1 : 1;
            var busX = dir * (hubW / 2 + REACH);
            var perColumn = Math.max(SIDE_ROWS, Math.ceil(list.length / 2));
            var tallest = Math.min(list.length, perColumn);
            var ys: number[] = [];
            for (var k = 0; k * perColumn < list.length; k++) {
                var column = list.slice(k * perColumn, (k + 1) * perColumn);
                var near = busX + dir * (STUB + k * (w + 14));
                var firstY = k % 2 ? overflowStart(-((tallest - 1) * pitch) / 2, pitch, tallest, column.length) : -((tallest - 1) * pitch) / 2;
                column.forEach(function (item, n) {
                    var cy = firstY + n * pitch;
                    ys.push(cy);
                    pill(item, dir < 0 ? near - w : near, cy - PILL_H / 2);
                    if (toPill) line('base-flow-diagram-stub', 'M' + fixed(busX) + ' ' + fixed(cy) + ' H' + fixed(near - dir * 3), true);
                    else line('base-flow-diagram-stub', 'M' + fixed(near - dir * 3) + ' ' + fixed(cy) + ' H' + fixed(busX), false);
                });
            }
            line('base-flow-diagram-trunk', 'M' + fixed(busX) + ' ' + fixed(Math.min.apply(null, ys.concat([0]))) + ' V' + fixed(Math.max.apply(null, ys.concat([0]))), false);
            sideBottom = Math.max(sideBottom, Math.max.apply(null, ys) + PILL_H / 2);
            var edge = dir * (hubW / 2 + 3);
            if (toHub) line('base-flow-diagram-join', 'M' + fixed(busX) + ' 0 H' + fixed(edge), true);
            else line('base-flow-diagram-join', 'M' + fixed(edge) + ' 0 H' + fixed(busX), false);
        });

        laneGroups.forEach(function (group) { svg.appendChild(group); });
        var hubGroup = svgEl('g', 'base-flow-diagram-hub');
        var hubTitle = svgEl('title');
        hubTitle.textContent = hub.title || String(hub.label || '');
        hubGroup.appendChild(hubTitle);
        hubGroup.appendChild(svgEl('rect', 'base-flow-diagram-hub-box', { x: fixed(-hubW / 2), y: fixed(-HUB_H / 2), width: fixed(hubW), height: HUB_H, rx: 8 }));
        var hubLabel = svgEl('text', 'base-flow-diagram-hub-label', { x: 0, y: 0, 'dominant-baseline': 'central' });
        hubLabel.textContent = hubText;
        hubGroup.appendChild(hubLabel);
        svg.appendChild(hubGroup);

        var minX = Math.min.apply(null, bounds.map(function (b) { return b[0]; })) - PAD;
        var maxX = Math.max.apply(null, bounds.map(function (b) { return b[0]; })) + PAD;
        var minY = Math.min.apply(null, bounds.map(function (b) { return b[1]; })) - PAD;
        var maxY = Math.max.apply(null, bounds.map(function (b) { return b[1]; })) + PAD;
        // The hub stays in the middle of the picture, whichever lanes are drawn.
        var half = Math.max(-minX, maxX);
        root.setAttribute('aria-label', names.join(', '));
        // Too wide for its box, the picture is drawn again as a stack at full size, rather than shrunk until it cannot be read.
        var room = root.clientWidth || 0;
        if (room && 2 * half > room && lanes.length) {
            targets = [];
            drawStack(hub, lanes, room);
            return;
        }
        root.classList.remove('stacked');
        svg.setAttribute('viewBox', (-half).toFixed(0) + ' ' + minY.toFixed(0) + ' ' + (2 * half).toFixed(0) + ' ' + (maxY - minY).toFixed(0));
        svg.setAttribute('width', String(Math.round(2 * half)));
        root.appendChild(svg);
    }

    // The narrow layout: the hub on top and every lane as a list under it, each on its own upright line. The first lane's
    // line sits nearest the pills and ends first, so no line ever crosses another, and the text keeps its full size.
    function drawStack(hub: FlowDiagramHub, lanes: FlowDiagramLane[], room: number): void {
        root.classList.add('stacked');
        var svg = svgEl('svg', null, { focusable: 'false' });
        var count = lanes.length;
        var trunkGap = 14;
        var pillX = 16 + count * trunkGap + 8;
        var w = Math.max(60, room - pillX - PAD);
        // The hub spans the width, and labels use the room they have, cut only by a maxLabel the caller set.
        var hubW = room - 2 * PAD;
        var hubText = shortLabel(String(hub.label || ''), Math.max(4, Math.floor((hubW - 32) / HUB_CHAR)));
        var pitch = PILL_H + PILL_GAP;
        var y = HUB_H + STUB;
        var groups: SVGElement[] = [];

        lanes.forEach(function (lane, i) {
            var group = svgEl('g', 'base-flow-diagram-lane', { 'data-key': lane.key });
            applyColor(group as unknown as HTMLElement, lane.color, 'gray');
            var arrowId = nextId('flow-arrow');
            var marker = svgEl('marker', null, { id: arrowId, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' });
            marker.appendChild(svgEl('path', 'base-flow-diagram-arrow', { d: 'M2 1L8 5L2 9' }));
            group.appendChild(marker);
            var lines = svgEl('g');
            var pills = svgEl('g');
            group.appendChild(lines);
            group.appendChild(pills);
            var toHub = lane.direction === 'in' || lane.direction === 'both';
            var toPill = lane.direction !== 'in';
            var hasDot = lane.items.some(function (item) { return !!item.status; });
            var chars = Math.max(4, Math.floor((w - (hasDot ? 38 : 24)) / PILL_CHAR));
            var trunkX = 16 + (count - 1 - i) * trunkGap;
            var lastY = y;
            lane.items.forEach(function (item) {
                var cy = y + PILL_H / 2;
                var g = svgEl('g', 'base-flow-diagram-item');
                var title = svgEl('title');
                title.textContent = item.title || laneText(item, lane);
                g.appendChild(title);
                g.appendChild(svgEl('rect', 'base-flow-diagram-pill', { x: fixed(pillX), y: fixed(y), width: fixed(w), height: PILL_H, rx: 6 }));
                if (item.status) {
                    var dot = svgEl('circle', 'base-flow-diagram-dot', { cx: fixed(pillX + 14), cy: fixed(cy), r: 4 });
                    applyColor(dot as unknown as HTMLElement, item.status, 'gray');
                    g.appendChild(dot);
                }
                var text = svgEl('text', 'base-flow-diagram-label', { x: fixed(pillX + (hasDot ? 25 : 12)), y: fixed(cy), 'dominant-baseline': 'central' });
                text.textContent = shortLabel(String(item.label || ''), options!.maxLabel ? Math.min(maxLabel, chars) : chars);
                g.appendChild(text);
                if (onSelect) {
                    g.setAttribute('role', 'button');
                    g.setAttribute('tabindex', '0');
                    g.setAttribute('aria-label', laneText(item, lane));
                    g.setAttribute('data-index', String(targets.length));
                    targets.push({ item: item, lane: lane });
                }
                pills.appendChild(g);
                var stub = svgEl('path', 'base-flow-diagram-line base-flow-diagram-stub', { d: toPill ? 'M' + fixed(trunkX) + ' ' + fixed(cy) + ' H' + fixed(pillX - 3) : 'M' + fixed(pillX - 3) + ' ' + fixed(cy) + ' H' + fixed(trunkX) });
                if (toPill) stub.setAttribute('marker-end', 'url(#' + arrowId + ')');
                lines.appendChild(stub);
                lastY = cy;
                y += pitch;
            });
            var trunk = svgEl('path', 'base-flow-diagram-line base-flow-diagram-trunk', { d: toHub ? 'M' + fixed(trunkX) + ' ' + fixed(lastY) + ' V' + fixed(HUB_H + 3) : 'M' + fixed(trunkX) + ' ' + fixed(HUB_H + 3) + ' V' + fixed(lastY) });
            if (toHub) trunk.setAttribute('marker-end', 'url(#' + arrowId + ')');
            lines.appendChild(trunk);
            groups.push(group);
            y += PILL_GAP;
        });

        groups.forEach(function (group) { svg.appendChild(group); });
        var hubGroup = svgEl('g', 'base-flow-diagram-hub');
        var hubTitle = svgEl('title');
        hubTitle.textContent = hub.title || String(hub.label || '');
        hubGroup.appendChild(hubTitle);
        hubGroup.appendChild(svgEl('rect', 'base-flow-diagram-hub-box', { x: PAD, y: 0, width: fixed(hubW), height: HUB_H, rx: 8 }));
        var hubLabel = svgEl('text', 'base-flow-diagram-hub-label', { x: fixed(PAD + hubW / 2), y: fixed(HUB_H / 2), 'dominant-baseline': 'central' });
        hubLabel.textContent = hubText;
        hubGroup.appendChild(hubLabel);
        svg.appendChild(hubGroup);
        var height = y - PILL_GAP + PAD;
        svg.setAttribute('viewBox', '0 0 ' + room + ' ' + fixed(height));
        svg.setAttribute('width', String(room));
        root.appendChild(svg);
    }

    function pick(e: Event): FlowDiagramItem | null {
        var target = e.target as Element | null;
        var g = target && target.closest ? target.closest('.base-flow-diagram-item') : null;
        if (!g || !root.contains(g)) return null;
        var hit = targets[Number(g.getAttribute('data-index'))];
        if (!hit) return null;
        onSelect!(hit.item, hit.lane);
        return hit.item;
    }

    if (onSelect) {
        stops.push(listen(root, 'click', function (e: Event) { pick(e); }));
        stops.push(listen(root, 'keydown', function (e: KeyboardEvent) {
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            if (pick(e)) e.preventDefault();
        }));
    }

    function setValue(next: FlowDiagramValue): void {
        next = next || ({} as FlowDiagramValue);
        value = { hub: next.hub || { label: '' }, lanes: (next.lanes || []).slice() };
        draw();
    }

    // The picture is drawn again when its box changes width, so it can turn into the stack and back.
    var lastRoom = -1;
    function fit(): void {
        var room = root.clientWidth || 0;
        if (room === lastRoom) return;
        lastRoom = room;
        draw();
    }
    if (typeof ResizeObserver !== 'undefined') {
        var watch = new ResizeObserver(fit);
        watch.observe(root);
        stops.push(function () { watch.disconnect(); });
    }

    setValue({ hub: options.hub || { label: '' }, lanes: options.lanes || [] });
    return {
        element: root,
        getValue: function () { return { hub: value.hub, lanes: value.lanes.slice() }; },
        setValue: setValue,
        destroy: function () { runAll(stops); targets = []; clear(root); }
    };
}
