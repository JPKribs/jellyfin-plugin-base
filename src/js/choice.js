// createChoiceGroup
// Wires a group of jpk-choice radio cards: keeps the selected class in step with the checked input for
// browsers without :has(), and reports changes. Pass the group element that holds the labels.
//
// Param: groupEl | element with the jpk-choice-group class
// Param: options | { onChange: function(value) [optional] }
// Returns { get, set, destroy }.
export function createChoiceGroup(groupEl, options) {
    options = options || {};
    if (!groupEl) throw new Error('createChoiceGroup needs a group element');

    function reflect() {
        groupEl.querySelectorAll('.jpk-choice').forEach(function (choice) {
            var input = choice.querySelector('input');
            choice.classList.toggle('selected', !!(input && input.checked));
        });
    }

    function onChange() {
        reflect();
        if (options.onChange) options.onChange(get());
    }

    function get() {
        var checked = groupEl.querySelector('input:checked');
        return checked ? checked.value : null;
    }

    groupEl.addEventListener('change', onChange);
    reflect();

    return {
        get: get,
        set: function (value) {
            groupEl.querySelectorAll('input').forEach(function (input) { input.checked = input.value === value; });
            reflect();
        },
        destroy: function () { groupEl.removeEventListener('change', onChange); }
    };
}
