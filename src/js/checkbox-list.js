// createCheckboxList
// A searchable list of checkbox rows for picking many arbitrary items — the generalization of
// createUserMultiSelector for things that are not users (series, libraries, files, ...). Rows can show a
// thumbnail, a label, a sublabel, and a note pill; items can be disabled; an optional "select all" row and a
// search box are built in. Fed by a static array or an async fetch.
//
// Param: options | {
//   items        : static array of item objects [optional]
//   fetchItems   : function() -> array | Promise<array>, overrides items [optional]
//   idKey        : property name or function(item)->id (default 'id')
//   value        : array of preselected ids [optional]
//   disabledIds  : array of ids to render non-selectable [optional]
//   renderRow    : function(item) -> { label, sublabel, imageUrl, note } (default reads item.name) [optional]
//   search       : show a search box (default true)
//   searchKeys   : properties to match the query against (default ['name']) — ignored when renderRow given
//   showSelectAll: add a select-all row (default false)
//   emptyMessage : message when no items match (default 'No items available.')
//   onChange     : function(idsArray) called on every selection change [optional]
// }
// Returns { element, ready, getValue, setValue, setDisabled, refresh, destroy }.
export function createCheckboxList(options) {
    options = options || {};

    var container = document.createElement('div');
    container.className = 'jpk-check-list';

    var searchInput = null;
    if (options.search !== false) {
        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'jpk-edit-input jpk-check-list-search';
        searchInput.placeholder = options.placeholder || 'Search…';
        container.appendChild(searchInput);
    }

    var selectAllRow = null;
    var selectAllCheck = null;
    if (options.showSelectAll) {
        selectAllRow = document.createElement('label');
        selectAllRow.className = 'jpk-check-row jpk-check-selectall hidden';
        selectAllCheck = document.createElement('input');
        selectAllCheck.type = 'checkbox';
        var selectAllName = document.createElement('span');
        selectAllName.className = 'jpk-check-label';
        selectAllName.textContent = 'Select all';
        selectAllRow.appendChild(selectAllCheck);
        selectAllRow.appendChild(selectAllName);
        container.appendChild(selectAllRow);
    }

    var body = document.createElement('div');
    body.className = 'jpk-check-list-body';
    container.appendChild(body);

    function idOf(item) {
        var k = options.idKey || 'id';
        return typeof k === 'function' ? k(item) : item[k];
    }
    function key(id) { return String(id == null ? '' : id); }

    var selected = {};
    (options.value || []).forEach(function (id) { selected[key(id)] = true; });

    var disabled = {};
    (options.disabledIds || []).forEach(function (id) { disabled[key(id)] = true; });

    var allItems = [];
    var query = '';

    function defaultRow(item) {
        return { label: item.name != null ? item.name : String(idOf(item)) };
    }

    function matches(item) {
        if (!query) return true;
        var keys = options.searchKeys || ['name'];
        var q = query.toLowerCase();
        return keys.some(function (k) {
            var v = item[k];
            return v != null && String(v).toLowerCase().indexOf(q) !== -1;
        });
    }

    function visibleItems() {
        return allItems.filter(matches);
    }

    function rowChecks() {
        return body.querySelectorAll('.jpk-check-row-input');
    }

    function getValue() {
        return Object.keys(selected).filter(function (k) { return selected[k]; });
    }

    function syncSelectAll() {
        if (!selectAllCheck) return;
        var checks = rowChecks();
        if (!checks.length) { selectAllRow.classList.add('hidden'); return; }
        selectAllRow.classList.remove('hidden');
        var on = 0;
        checks.forEach(function (cb) { if (cb.checked) on++; });
        selectAllCheck.checked = on === checks.length;
        selectAllCheck.indeterminate = on > 0 && on < checks.length;
    }

    function emit() {
        if (options.onChange) options.onChange(getValue());
    }

    function render() {
        body.innerHTML = '';
        var items = visibleItems();
        if (!items.length) {
            var empty = document.createElement('div');
            empty.className = 'jpk-check-empty';
            empty.textContent = options.emptyMessage || 'No items available.';
            body.appendChild(empty);
            syncSelectAll();
            return;
        }

        items.forEach(function (item) {
            var id = idOf(item);
            var isDisabled = !!disabled[key(id)];
            var info = (options.renderRow || defaultRow)(item) || {};

            var row = document.createElement('label');
            row.className = 'jpk-check-row' + (isDisabled ? ' jpk-check-row-disabled' : '');

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'jpk-check-row-input';
            cb.setAttribute('data-id', id);
            cb.checked = !!selected[key(id)];
            cb.disabled = isDisabled;
            if (!isDisabled) {
                cb.addEventListener('change', function () {
                    selected[key(id)] = cb.checked;
                    syncSelectAll();
                    emit();
                });
            }
            row.appendChild(cb);

            if (info.imageUrl) {
                var img = document.createElement('img');
                img.className = 'jpk-check-thumb';
                img.src = info.imageUrl;
                img.alt = '';
                row.appendChild(img);
            }

            var textWrap = document.createElement('span');
            textWrap.className = 'jpk-check-text';
            var label = document.createElement('span');
            label.className = 'jpk-check-label';
            label.textContent = info.label != null ? info.label : '';
            textWrap.appendChild(label);
            if (info.sublabel) {
                var sub = document.createElement('span');
                sub.className = 'jpk-check-sub';
                sub.textContent = info.sublabel;
                textWrap.appendChild(sub);
            }
            row.appendChild(textWrap);

            if (info.note) {
                var note = document.createElement('span');
                note.className = 'jpk-check-note';
                note.textContent = info.note;
                row.appendChild(note);
            }

            body.appendChild(row);
        });

        syncSelectAll();
    }

    if (selectAllCheck) {
        selectAllCheck.addEventListener('change', function () {
            var checked = selectAllCheck.checked;
            visibleItems().forEach(function (item) {
                var id = idOf(item);
                if (disabled[key(id)]) return;
                selected[key(id)] = checked;
            });
            selectAllCheck.indeterminate = false;
            render();
            emit();
        });
    }

    var searchTimer = null;
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            if (searchTimer) clearTimeout(searchTimer);
            searchTimer = setTimeout(function () { query = searchInput.value; render(); }, 200);
        });
    }

    function load() {
        var source = typeof options.fetchItems === 'function' ? options.fetchItems() : (options.items || []);
        return Promise.resolve(source).then(function (list) {
            allItems = Array.isArray(list) ? list : (list && list.Items) || [];
            render();
            return allItems;
        }).catch(function () { allItems = []; render(); return []; });
    }

    var ready = load();

    return {
        element: container,
        ready: ready,
        getValue: getValue,
        setValue: function (ids) {
            selected = {};
            (ids || []).forEach(function (id) { selected[key(id)] = true; });
            render();
        },
        setDisabled: function (ids) {
            disabled = {};
            (ids || []).forEach(function (id) { disabled[key(id)] = true; });
            render();
        },
        refresh: function () { return load(); },
        destroy: function () { if (searchTimer) clearTimeout(searchTimer); }
    };
}
