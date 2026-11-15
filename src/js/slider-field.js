import { make, listen, runAll } from './dom-util.js';

// Reads a number option, and falls back when it is missing or not a finite number.
function finite(value, fallback) {
    var n = parseFloat(value);
    return isFinite(n) ? n : fallback;
}

// createSliderField
// A range input with a readout of its value. The readout is an output element and the input carries aria-valuetext with the same text.
//
// Param: options | {
//   value    : first value (default min)
//   min      : lowest value (default 0)
//   max      : highest value (default 100), and a min above max swaps the two
//   step     : step (default 1)
//   prefix   : text before the readout number [optional]
//   suffix   : text after the readout number, such as '%' [optional]
//   label    : aria-label of the slider (default 'Value')
//   showValue: false hides the readout (default true)
//   onChange : function(value) called as the slider moves [optional]
// }
// Returns { element, input, getValue, setValue, destroy }. getValue returns a number. setValue keeps the value inside min and max and ignores a value that is not a number.
export function createSliderField(options) {
    options = options || {};
    var min = finite(options.min, 0);
    var max = finite(options.max, 100);
    // A range written backwards is read the right way round.
    if (min > max) { var swap = min; min = max; max = swap; }
    var cleanups = [];

    var root = make('div', 'jpk-slider');
    var input = make('input', '', { type: 'range', min: String(min), max: String(max), step: String(finite(options.step, 1) > 0 ? finite(options.step, 1) : 1), 'aria-label': options.label || 'Value' });
    var readout = make('output', 'jpk-slider-value');
    readout.hidden = options.showValue === false;
    root.appendChild(input);
    root.appendChild(readout);

    function reflect() {
        var text = (options.prefix || '') + input.value + (options.suffix || '');
        readout.textContent = text;
        input.setAttribute('aria-valuetext', text);
    }

    function clamp(n) { return Math.min(max, Math.max(min, n)); }

    input.value = String(clamp(finite(options.value, min)));
    reflect();
    cleanups.push(listen(input, 'input', function () {
        reflect();
        if (options.onChange) options.onChange(parseFloat(input.value));
    }));

    return {
        element: root,
        input: input,
        getValue: function () { return parseFloat(input.value); },
        setValue: function (value) {
            var n = parseFloat(value);
            if (!isFinite(n)) return;
            input.value = String(clamp(n));
            reflect();
        },
        destroy: function () { runAll(cleanups); }
    };
}
