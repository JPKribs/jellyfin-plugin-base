import { make, icon, clear, has } from './dom-util.js';

var STATUS_ICONS = { green: 'check_circle', red: 'error', orange: 'schedule', purple: 'sync', blue: 'info', gray: 'remove_circle_outline', yellow: 'info', pink: 'info', teal: 'info' };
var STATUS_LABELS = { green: 'Done', red: 'Failed', orange: 'Waiting', purple: 'Working', blue: 'Info', gray: 'Off', yellow: 'Note', pink: 'Note', teal: 'Note' };

// createTimeline
// A vertical list of events, each with a colored marker, a time, a title, and an optional body. A status also shows an icon in its marker and a hidden label, so the status never rests on color alone.
//
// Param: options | {
//   items     : array of { time, datetime, title, body, status, icon } where status is a status color name such as 'green', and icon is a Material icon name (default an icon for the status) [optional]
//   emptyText : sentence shown while there are no events [optional]
//   statusLabels : map of status color name to the hidden label a screen reader reads, such as { green: 'Done' } (default a word for each color) [optional]
// }
// Returns { element, getValue, setValue, setItems, destroy }.
// A datetime such as 2026-03-10T12:00 makes the time a time element with that machine value.
export function createTimeline(options) {
    options = options || {};
    var items = [];
    var root = make('div', 'jpk-timeline-wrap');
    var list = make('ol', 'jpk-timeline');
    var empty = make('div', 'jpk-timeline-empty', null, options.emptyText || '');
    root.appendChild(list);
    root.appendChild(empty);

    // The hidden label of a status, from the caller's map first and then the defaults.
    function labelOf(status) {
        var custom = options.statusLabels;
        if (custom && has(custom, status) && custom[status]) return custom[status];
        return has(STATUS_LABELS, status) ? STATUS_LABELS[status] : '';
    }

    function render() {
        clear(list);
        empty.hidden = items.length > 0 || !options.emptyText;
        items.forEach(function (item) {
            var li = make('li', 'jpk-timeline-item' + (item.status ? ' ' + item.status : ''));
            var marker = make('span', 'jpk-timeline-marker', { 'aria-hidden': 'true' });
            var glyph = item.icon || (has(STATUS_ICONS, item.status) ? STATUS_ICONS[item.status] : '');
            if (glyph) marker.appendChild(icon(glyph));
            li.appendChild(marker);
            var body = make('div', 'jpk-timeline-body');
            var status = labelOf(item.status);
            if (status) body.appendChild(make('span', 'jpk-sr-only', null, status));
            if (item.time) body.appendChild(make(item.datetime ? 'time' : 'span', 'jpk-timeline-time', item.datetime ? { datetime: item.datetime } : null, item.time));
            body.appendChild(make('div', 'jpk-timeline-title', null, item.title));
            if (item.body) body.appendChild(make('div', 'jpk-timeline-text', null, item.body));
            li.appendChild(body);
            list.appendChild(li);
        });
    }

    function setValue(next) { items = (next || []).slice(); render(); }
    setValue(options.items);
    return {
        element: root,
        getValue: function () { return items.slice(); },
        setValue: setValue,
        setItems: setValue,
        destroy: function () { clear(list); }
    };
}
