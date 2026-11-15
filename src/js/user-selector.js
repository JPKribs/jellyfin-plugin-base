// Turns a value into text for textContent, with null and undefined as ''.
function escapeText(value) {
    return value === null || value === undefined ? '' : String(value);
}

// Normalizes an id for comparison, so GUIDs that differ only by case or dashes still match, such as an "N" format id against a "D" format one.
function idKey(id) {
    return String(id === null || id === undefined ? '' : id).replace(/-/g, '').toLowerCase();
}

// Normalizes a raw record from ApiClient.getUsers() or a plugin DTO to { id, name, isAdmin, imageTag }.
function normalizeUser(raw) {
    var policy = raw.Policy || raw.policy || {};
    var isAdmin = policy.IsAdministrator;
    if (isAdmin === undefined) isAdmin = raw.IsAdministrator;
    if (isAdmin === undefined) isAdmin = raw.isAdmin;
    return {
        id: raw.Id || raw.id || '',
        name: raw.Name || raw.name || '',
        isAdmin: !!isAdmin,
        imageTag: raw.PrimaryImageTag || (raw.ImageTags && raw.ImageTags.Primary) || null
    };
}

// Keeps every user, only non administrators for 'exclude', or only administrators for 'only'.
function applyAdminFilter(users, mode) {
    if (mode === 'exclude') return users.filter(function (u) { return !u.isAdmin; });
    if (mode === 'only') return users.filter(function (u) { return u.isAdmin; });
    return users;
}

// Fetches the raw user list from options.fetchUsers, else ApiClient.getUsers, else a GET of Users, else an empty list.
function fetchRawUsers(options) {
    if (typeof options.fetchUsers === 'function') {
        return Promise.resolve(options.fetchUsers());
    }
    if (typeof ApiClient !== 'undefined' && ApiClient) {
        if (typeof ApiClient.getUsers === 'function') {
            try { return Promise.resolve(ApiClient.getUsers()); } catch (e) { /* fall through */ }
        }
        if (typeof ApiClient.getJSON === 'function' && typeof ApiClient.getUrl === 'function') {
            try { return Promise.resolve(ApiClient.getJSON(ApiClient.getUrl('Users'))); } catch (e) { /* fall through */ }
        }
    }
    return Promise.resolve([]);
}

// Resolves, normalizes, filters, and sorts the user list by name, giving an empty list when the fetch fails.
function loadUsers(options) {
    return fetchRawUsers(options).then(function (raw) {
        // A source may return a plain array or a paged { Items } envelope.
        var list = Array.isArray(raw) ? raw : (raw && raw.Items) || [];
        var users = list.map(normalizeUser);
        users = applyAdminFilter(users, options.adminFilter || 'all');
        users.sort(function (a, b) { return a.name.localeCompare(b.name); });
        return users;
    }).catch(function () { return []; });
}

// Returns the avatar URL for a user, or null when the user has no image or ApiClient cannot build one.
function avatarUrl(user) {
    if (!user.imageTag || typeof ApiClient === 'undefined' || !ApiClient.getUserImageUrl) return null;
    try {
        return ApiClient.getUserImageUrl(user.id, { tag: user.imageTag, type: 'Primary', height: 56 });
    } catch (e) {
        return null;
    }
}

// createUserSelector
// Builds a single-user dropdown from the server's user list.
//
// Param: options | {
//   adminFilter        : 'all' | 'exclude' | 'only', to keep everyone, hide administrators, or keep only administrators (default 'all')
//   value              : preselected user id [optional]
//   includeEmptyOption : add a none entry (default true)
//   emptyLabel         : label for the none entry (default 'None')
//   placeholder        : alias for emptyLabel [optional]
//   showAdminBadge     : append " (admin)" to administrator names (default true)
//   fetchUsers         : function returning the user list, which replaces ApiClient.getUsers() [optional]
//   onChange           : function(userId) called on selection change [optional]
// }
// Returns { element, ready, getValue, setValue, refresh, destroy }.
export function createUserSelector(options) {
    options = options || {};

    var container = document.createElement('div');
    container.className = 'jpk-selector jpk-user-selector';

    var select = document.createElement('select');
    select.className = 'jpk-selector-dropdown jpk-user-select';
    container.appendChild(select);

    var includeEmpty = options.includeEmptyOption !== false;
    var emptyLabel = options.emptyLabel || options.placeholder || 'None';
    var showAdminBadge = options.showAdminBadge !== false;
    var pending = options.value || '';

    // Selects the option whose id matches, or the first option when none does.
    function selectByValue(value) {
        var want = idKey(value);
        for (var i = 0; i < select.options.length; i++) {
            if (idKey(select.options[i].value) === want) { select.selectedIndex = i; return; }
        }
        select.selectedIndex = 0;
    }

    // Rebuilds the options and keeps the pending value selected.
    function render(users) {
        select.innerHTML = '';
        if (includeEmpty) {
            var none = document.createElement('option');
            none.value = '';
            none.textContent = emptyLabel;
            select.appendChild(none);
        }
        users.forEach(function (u) {
            var opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.name + (showAdminBadge && u.isAdmin ? ' (admin)' : '');
            select.appendChild(opt);
        });
        selectByValue(pending);
        pending = select.value;
        return users;
    }

    select.addEventListener('change', function () {
        pending = select.value;
        if (options.onChange) options.onChange(pending);
    });

    var ready = loadUsers(options).then(render);

    return {
        element: container,
        ready: ready,
        getValue: function () { return select.value; },
        setValue: function (id) { pending = id || ''; selectByValue(pending); pending = select.value; },
        refresh: function () { return loadUsers(options).then(render); },
        destroy: function () { /* no document-level listeners */ }
    };
}

// createUserMultiSelector
// Builds a checkbox list for picking many users from the server's user list.
//
// Param: options | {
//   adminFilter   : 'all' | 'exclude' | 'only', to keep everyone, hide administrators, or keep only administrators (default 'all')
//   value         : array of preselected user ids [optional]
//   disabledIds   : array of user ids to render non-selectable, such as users already assigned elsewhere [optional]
//   noteFor       : function(user) returning a string for a pill on the row, such as a group name [optional]
//   showSelectAll : add a select all row (default false)
//   selectAllText : the label of the select all row (default 'Select all')
//   showAvatars   : render user avatars when available (default true)
//   emptyMessage  : message shown when no users match (default 'No users available.')
//   fetchUsers    : function returning the user list, which replaces ApiClient.getUsers() [optional]
//   onChange      : function(idsArray) called whenever the selection changes [optional]
// }
// Returns { element, ready, getValue, setValue, setDisabled, refresh, destroy }.
// setDisabled(ids) swaps the disabled ids and re-renders without refetching.
export function createUserMultiSelector(options) {
    options = options || {};

    var container = document.createElement('div');
    container.className = 'jpk-user-multi';

    var selectAllRow = null;
    var selectAllCheck = null;
    if (options.showSelectAll) {
        selectAllRow = document.createElement('label');
        selectAllRow.className = 'jpk-user-multi-option jpk-user-multi-selectall';
        selectAllCheck = document.createElement('input');
        selectAllCheck.type = 'checkbox';
        selectAllCheck.className = 'jpk-user-multi-check';
        var selectAllName = document.createElement('span');
        selectAllName.className = 'jpk-user-multi-name';
        selectAllName.textContent = options.selectAllText || 'Select all';
        selectAllRow.appendChild(selectAllCheck);
        selectAllRow.appendChild(selectAllName);
        container.appendChild(selectAllRow);
        selectAllRow.classList.add('hidden');
    }

    var listEl = document.createElement('div');
    listEl.className = 'jpk-user-multi-list';
    container.appendChild(listEl);

    // Keyed by normalized id, so a selection survives a re-render that filters a user out of view.
    var selected = {};
    (options.value || []).forEach(function (id) { selected[idKey(id)] = true; });

    var disabled = {};
    (options.disabledIds || []).forEach(function (id) { disabled[idKey(id)] = true; });

    // Kept so setDisabled can re-render without refetching.
    var currentUsers = [];

    var showAvatars = options.showAvatars !== false;

    function rowChecks() {
        return listEl.querySelectorAll('.jpk-user-multi-check');
    }

    function getValue() {
        var ids = [];
        rowChecks().forEach(function (cb) {
            if (cb.checked) ids.push(cb.getAttribute('data-id'));
        });
        return ids;
    }

    // Shows the select all row only while rows exist, and sets its checked and mixed state.
    function syncSelectAll() {
        if (!selectAllCheck) return;
        var checks = rowChecks();
        if (!checks.length) { selectAllRow.classList.add('hidden'); return; }
        selectAllRow.classList.remove('hidden');
        var total = checks.length;
        var on = 0;
        checks.forEach(function (cb) { if (cb.checked) on++; });
        selectAllCheck.checked = on === total;
        selectAllCheck.indeterminate = on > 0 && on < total;
    }

    function emitChange() {
        if (options.onChange) options.onChange(getValue());
    }

    // Rebuilds the rows for a user list.
    function render(users) {
        currentUsers = users;
        listEl.innerHTML = '';

        if (!users.length) {
            var empty = document.createElement('div');
            empty.className = 'jpk-user-multi-empty';
            empty.textContent = options.emptyMessage || 'No users available.';
            listEl.appendChild(empty);
            syncSelectAll();
            return users;
        }

        users.forEach(function (u) {
            var isDisabled = !!disabled[idKey(u.id)];

            var row = document.createElement('label');
            row.className = 'jpk-user-multi-option' + (isDisabled ? ' jpk-user-multi-disabled' : '');

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'jpk-user-multi-check';
            cb.setAttribute('data-id', u.id);
            cb.checked = !!selected[idKey(u.id)];
            cb.disabled = isDisabled;
            if (!isDisabled) {
                cb.addEventListener('change', function () {
                    selected[idKey(u.id)] = cb.checked;
                    syncSelectAll();
                    emitChange();
                });
            }
            row.appendChild(cb);

            if (showAvatars) {
                var url = avatarUrl(u);
                if (url) {
                    var img = document.createElement('img');
                    img.className = 'jpk-user-multi-avatar';
                    img.src = url;
                    img.alt = '';
                    row.appendChild(img);
                }
            }

            var name = document.createElement('span');
            name.className = 'jpk-user-multi-name';
            name.textContent = escapeText(u.name);
            row.appendChild(name);

            if (u.isAdmin) {
                var badge = document.createElement('span');
                badge.className = 'jpk-user-multi-admin';
                badge.textContent = 'admin';
                row.appendChild(badge);
            }

            var note = options.noteFor ? options.noteFor(u) : '';
            if (note) {
                var noteEl = document.createElement('span');
                noteEl.className = 'jpk-user-multi-note';
                noteEl.textContent = escapeText(note);
                row.appendChild(noteEl);
            }

            listEl.appendChild(row);
        });

        syncSelectAll();
        return users;
    }

    if (selectAllCheck) {
        selectAllCheck.addEventListener('change', function () {
            var checked = selectAllCheck.checked;
            rowChecks().forEach(function (cb) {
                if (cb.disabled) return;
                cb.checked = checked;
                selected[idKey(cb.getAttribute('data-id'))] = checked;
            });
            selectAllCheck.indeterminate = false;
            emitChange();
        });
    }

    var ready = loadUsers(options).then(render);

    return {
        element: container,
        ready: ready,
        getValue: getValue,
        setValue: function (ids) {
            selected = {};
            (ids || []).forEach(function (id) { selected[idKey(id)] = true; });
            rowChecks().forEach(function (cb) { cb.checked = !!selected[idKey(cb.getAttribute('data-id'))]; });
            syncSelectAll();
        },
        setDisabled: function (ids) {
            disabled = {};
            (ids || []).forEach(function (id) { disabled[idKey(id)] = true; });
            if (currentUsers.length) render(currentUsers);
        },
        refresh: function () { return loadUsers(options).then(render); },
        destroy: function () { /* no document-level listeners */ }
    };
}
