// createChipSelect
// A typeahead multi-select: type to search, click a result to add it as a removable chip. Backed either by a
// static option list or an async search function. Built on the shared jpk-combo (input + dropdown) and
// jpk-tags/jpk-tag (chips) styles, so it matches the rest of the kit.
//
// Param: options | {
//   value       : preselected values — array of strings or { value, label } pairs [optional]
//   options     : static list of choices — strings or { value, label } [optional]
//   searchFn    : function(query, cb) -> cb([{ value, label }]) — async source, overrides options [optional]
//   placeholder : input placeholder [optional]
//   single      : keep at most one selection, replacing it on the next pick (default false)
//   allowCreate : add the typed text as a value on Enter when it matches no option (default false)
//   maxResults  : cap the dropdown length (default 50)
//   onChange    : function(valuesArray, itemsArray) called whenever the selection changes [optional]
// }
// Returns { element, getValue, getItems, setValue, setOptions, clear, refresh, destroy }.
// getValue returns the selected values; getItems returns the { value, label } pairs (so a caller keying an
// opaque id can persist and later restore the friendly label without re-fetching). setOptions swaps the
// static choice list after construction (for a list that loads asynchronously).
export function createChipSelect(options) {
    options = options || {};

    // Static choices, swappable post-construction via setOptions (searchFn takes precedence when given).
    var staticOptions = options.options || [];

    var container = document.createElement('div');
    container.className = 'jpk-chip-select';

    var tags = document.createElement('div');
    tags.className = 'jpk-tags';
    container.appendChild(tags);

    var combo = document.createElement('div');
    combo.className = 'jpk-combo';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'jpk-edit-input';
    input.placeholder = options.placeholder || '';
    var dropdown = document.createElement('div');
    dropdown.className = 'jpk-combo-dropdown hidden';
    combo.appendChild(input);
    combo.appendChild(dropdown);
    container.appendChild(combo);

    var maxResults = options.maxResults || 50;

    // Selection stored as ordered { value, label } pairs, keyed by String(value) for de-dup.
    var selected = [];
    function key(v) { return String(v); }
    function has(value) { return selected.some(function (s) { return key(s.value) === key(value); }); }

    function normalize(item) {
        if (item && typeof item === 'object') return { value: item.value, label: item.label != null ? item.label : String(item.value) };
        return { value: item, label: String(item) };
    }

    (options.value || []).forEach(function (v) {
        var n = normalize(v);
        if (!has(n.value)) selected.push(n);
    });

    function emit() {
        if (options.onChange) options.onChange(getValue(), getItems());
    }

    function getValue() {
        return selected.map(function (s) { return s.value; });
    }

    function getItems() {
        return selected.map(function (s) { return { value: s.value, label: s.label }; });
    }

    function renderChips() {
        tags.innerHTML = '';
        selected.forEach(function (item) {
            var chip = document.createElement('span');
            chip.className = 'jpk-tag';
            var text = document.createElement('span');
            text.textContent = item.label;
            var remove = document.createElement('span');
            remove.className = 'jpk-tag-remove';
            remove.textContent = '×';
            remove.addEventListener('click', function () { removeAt(key(item.value)); });
            chip.appendChild(text);
            chip.appendChild(remove);
            tags.appendChild(chip);
        });
    }

    function removeAt(k) {
        selected = selected.filter(function (s) { return key(s.value) !== k; });
        renderChips();
        emit();
    }

    function addItem(item) {
        var n = normalize(item);
        if (n.value === '' || n.value == null || has(n.value)) return;
        if (options.single) selected = [n];
        else selected.push(n);
        renderChips();
        emit();
    }

    var activeIndex = -1;
    var currentResults = [];

    function search(query, cb) {
        if (typeof options.searchFn === 'function') {
            options.searchFn(query, cb);
            return;
        }
        var q = (query || '').toLowerCase();
        var list = staticOptions.map(normalize).filter(function (o) {
            return !has(o.value) && (!q || o.label.toLowerCase().indexOf(q) !== -1);
        });
        cb(list);
    }

    function renderDropdown(results) {
        currentResults = results.map(normalize).filter(function (o) { return !has(o.value); }).slice(0, maxResults);
        activeIndex = -1;
        dropdown.innerHTML = '';
        if (!currentResults.length) { dropdown.classList.add('hidden'); return; }
        currentResults.forEach(function (item, i) {
            var opt = document.createElement('div');
            opt.className = 'jpk-combo-option';
            opt.textContent = item.label;
            opt.addEventListener('mousedown', function (e) {
                e.preventDefault(); // keep focus in the input
                addItem(item);
                input.value = '';
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(opt);
        });
        dropdown.classList.remove('hidden');
    }

    function highlight(delta) {
        if (!currentResults.length) return;
        activeIndex = (activeIndex + delta + currentResults.length) % currentResults.length;
        var opts = dropdown.querySelectorAll('.jpk-combo-option');
        opts.forEach(function (o, i) { o.classList.toggle('active', i === activeIndex); });
    }

    input.addEventListener('input', function () {
        search(input.value, renderDropdown);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); highlight(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(-1); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && currentResults[activeIndex]) {
                addItem(currentResults[activeIndex]);
                input.value = '';
                dropdown.classList.add('hidden');
            } else if (options.allowCreate && input.value.trim()) {
                addItem(input.value.trim());
                input.value = '';
                dropdown.classList.add('hidden');
            }
        } else if (e.key === 'Backspace' && !input.value && selected.length) {
            removeAt(key(selected[selected.length - 1].value));
        } else if (e.key === 'Escape') {
            dropdown.classList.add('hidden');
        }
    });

    input.addEventListener('focus', function () {
        if (!input.value) search('', renderDropdown);
    });

    function onDocClick(e) {
        if (!container.contains(e.target)) dropdown.classList.add('hidden');
    }
    document.addEventListener('click', onDocClick);

    renderChips();

    return {
        element: container,
        getValue: getValue,
        getItems: getItems,
        setValue: function (values) {
            selected = [];
            (values || []).forEach(function (v) {
                var n = normalize(v);
                if (!has(n.value)) selected.push(n);
            });
            renderChips();
        },
        setOptions: function (list) { staticOptions = list || []; },
        clear: function () { selected = []; renderChips(); emit(); },
        refresh: function () { search(input.value, renderDropdown); },
        destroy: function () { document.removeEventListener('click', onDocClick); }
    };
}
