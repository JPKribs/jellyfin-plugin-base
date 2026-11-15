// createPillGroup
// Wires a jpk-pill-group of buttons as a single choice, keeping aria-pressed and the selected class on the chosen pill. It reports each change to onChange.
//
// Param: groupEl | element with the jpk-pill-group class, holding jpk-pill buttons whose value is their data-value or their text
// Param: options | { onChange: function(value) [optional] }
// Returns { get, set, destroy }.
export function createPillGroup(groupEl, options) {
    options = options || {};
    if (!groupEl) throw new Error('createPillGroup needs a group element');

    function pills() { return Array.prototype.slice.call(groupEl.querySelectorAll('.jpk-pill')); }

    function valueOf(pill) {
        var value = pill.getAttribute('data-value');
        return value === null ? pill.textContent : value;
    }

    // Marks the given pill, or none, as the chosen one.
    function reflect(chosen) {
        pills().forEach(function (pill) {
            var on = pill === chosen;
            pill.classList.toggle('selected', on);
            pill.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function current() {
        return pills().filter(function (pill) { return pill.getAttribute('aria-pressed') === 'true' || pill.classList.contains('selected'); })[0] || null;
    }

    function get() {
        var chosen = current();
        return chosen ? valueOf(chosen) : null;
    }

    function onClick(e) {
        var pill = e.target.closest && e.target.closest('.jpk-pill');
        if (!pill || !groupEl.contains(pill) || pill.disabled || pill === current()) return;
        reflect(pill);
        if (options.onChange) options.onChange(valueOf(pill));
    }

    groupEl.addEventListener('click', onClick);
    reflect(current());

    return {
        get: get,
        set: function (value) {
            reflect(pills().filter(function (pill) { return valueOf(pill) === value; })[0] || null);
        },
        destroy: function () { groupEl.removeEventListener('click', onClick); }
    };
}
