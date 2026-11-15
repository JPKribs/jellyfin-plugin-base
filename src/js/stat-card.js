import { make, icon } from './dom-util.js';

// createStatCard
// A status card with a number, a label, and an optional trend. The trend is a number with an arrow, green when the change is good and red when it is bad, and gray at zero.
//
// Param: options | {
//   value         : the number or text shown large [optional]
//   label         : text under the value [optional]
//   color         : card color name such as 'blue' or 'green', as the jpk-card modifiers [optional]
//   trend         : change as a number, where 12 is up 12 and -3 is down 3 [optional]
//   trendSuffix   : text after the trend number, such as '%' [optional]
//   trendLabel    : text after the trend, such as 'vs last week' [optional]
//   positiveIsGood: false makes an increase red and a decrease green (default true)
//   trendUpText   : hidden text for an increase (default 'Up')
//   trendDownText : hidden text for a decrease (default 'Down')
//   trendFlatText : hidden text for no change (default 'No change')
// }
// Returns { element, getValue, setValue, destroy }. getValue returns the options as drawn, and setValue takes the same shape.
// The trend arrow carries hidden text so a screen reader hears the direction.
export function createStatCard(options) {
    options = options || {};
    var root = make('div', 'jpk-card jpk-stat');
    var valueEl = make('span', 'jpk-card-count');
    var labelEl = make('span', 'jpk-card-label');
    var trendEl = make('span', 'jpk-stat-trend');
    root.appendChild(valueEl);
    root.appendChild(labelEl);
    root.appendChild(trendEl);
    var state = {};

    function redraw(next) {
        state = Object.assign({}, next);
        root.className = 'jpk-card jpk-stat' + (next.color ? ' ' + next.color : '');
        valueEl.textContent = next.value === undefined || next.value === null ? '' : String(next.value);
        labelEl.textContent = next.label || '';
        trendEl.innerHTML = '';
        var hasTrend = typeof next.trend === 'number' && !isNaN(next.trend);
        trendEl.hidden = !hasTrend;
        if (!hasTrend) return;
        var direction = next.trend > 0 ? 'up' : (next.trend < 0 ? 'down' : 'flat');
        var good = direction === 'flat' ? null : ((direction === 'up') === (next.positiveIsGood !== false));
        trendEl.className = 'jpk-stat-trend ' + (good === null ? 'flat' : (good ? 'good' : 'bad'));
        trendEl.appendChild(icon(direction === 'up' ? 'arrow_upward' : (direction === 'down' ? 'arrow_downward' : 'remove')));
        var word = direction === 'up' ? (options.trendUpText || 'Up') : (direction === 'down' ? (options.trendDownText || 'Down') : (options.trendFlatText || 'No change'));
        trendEl.appendChild(make('span', 'jpk-sr-only', null, word));
        trendEl.appendChild(make('span', '', null, Math.abs(next.trend) + (next.trendSuffix || '') + (next.trendLabel ? ' ' + next.trendLabel : '')));
    }

    redraw(options);
    return {
        element: root,
        getValue: function () { return Object.assign({}, state); },
        setValue: function (next) { redraw(Object.assign({}, state, next || {})); },
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
