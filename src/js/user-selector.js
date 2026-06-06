// User selector components.
//
// Two controls for picking Jellyfin users on a config page, both built on the dashboard ApiClient:
//   * createUserSelector       - a single-user dropdown
//   * createUserMultiSelector  - a checkbox list for picking many users
//
// Both fetch the server's user list once, apply an admin filter, and render. The admin filter lets a
// caller drop administrators (e.g. an "approved non-admin users" list) or keep only administrators.
//
// adminFilter:
//   'all'     - every user (default)
//   'exclude' - hide administrators
//   'only'    - only administrators

function escapeText(value) {
    return value === null || value === undefined ? '' : String(value);
}

// Normalized key for comparing ids, so GUIDs differing only by casing or dashes still match
// (e.g. a value stored as "N" format against an ApiClient id in "D" format).
function idKey(id) {
    return String(id === null || id === undefined ? '' : id).replace(/-/g, '').toLowerCase();
}

// Normalize a raw record from ApiClient.getUsers() (or a plugin DTO) to { id, name, isAdmin, imageTag }.
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

function applyAdminFilter(users, mode) {
    if (mode === 'exclude') return users.filter(function (u) { return !u.isAdmin; });
    if (mode === 'only') return users.filter(function (u) { return u.isAdmin; });
    return users;
}

// Fetch the raw user list. Prefer the web client's helper, which tracks whatever endpoint the running
// server expects — the user-list pull was reworked server-side in the 10.11.x EFCore refactor and the
// /Users privilege scope is being tightened, so we lean on ApiClient rather than a hard-coded route.
// Falls back to a direct /Users GET, then to an empty list, and degrades instead of throwing.
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

// Resolve, normalize, filter and sort the user list. options.fetchUsers overrides the default source.
function loadUsers(options) {
    return fetchRawUsers(options).then(function (raw) {
        // Accept a plain array or a paged { Items: [...] } envelope.
        var list = Array.isArray(raw) ? raw : (raw && raw.Items) || [];
        var users = list.map(normalizeUser);
        users = applyAdminFilter(users, options.adminFilter || 'all');
        users.sort(function (a, b) { return a.name.localeCompare(b.name); });
        return users;
    }).catch(function () { return []; });
}

// Best-effort avatar URL; returns null when the user has no image or ApiClient can't build one.
function avatarUrl(user) {
    if (!user.imageTag || typeof ApiClient === 'undefined' || !ApiClient.getUserImageUrl) return null;
    try {
        return ApiClient.getUserImageUrl(user.id, { tag: user.imageTag, type: 'Primary', height: 56 });
    } catch (e) {
        return null;
    }
}

// createUserSelector
// Builds a single-user dropdown. Returns a handle exposing the element, a ready promise, and value access.
//
// Param: options | {
//   adminFilter        : 'all' | 'exclude' | 'only'   (default 'all')
//   value              : preselected user id
//   includeEmptyOption : add a "none" entry (default true)
//   emptyLabel         : label for the none entry (default '— None —')
//   placeholder        : alias for emptyLabel
//   showAdminBadge     : append " (admin)" to admin names (default true)
//   fetchUsers         : override the ApiClient.getUsers() source
//   onChange           : function(userId) called on selection change
// }
export function createUserSelector(options) {
    options = options || {};

    var container = document.createElement('div');
    container.className = 'jpk-selector jpk-user-selector';

    var select = document.createElement('select');
    select.className = 'jpk-selector-dropdown jpk-user-select';
    container.appendChild(select);

    var includeEmpty = options.includeEmptyOption !== false;
    var emptyLabel = options.emptyLabel || options.placeholder || '— None —';
    var showAdminBadge = options.showAdminBadge !== false;
    var pending = options.value || '';

    // Select the option whose id matches (format-insensitively); fall back to the first option.
    function selectByValue(value) {
        var want = idKey(value);
        for (var i = 0; i < select.options.length; i++) {
            if (idKey(select.options[i].value) === want) { select.selectedIndex = i; return; }
        }
        select.selectedIndex = 0;
    }

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
        refresh: function () { var r = loadUsers(options).then(render); return r; },
        destroy: function () { /* no document-level listeners */ }
    };
}

// createUserMultiSelector
// Builds a checkbox list for picking many users. Returns a handle exposing the element, a ready promise,
// and array value access.
//
// Param: options | {
//   adminFilter   : 'all' | 'exclude' | 'only'   (default 'all')
//   value         : array of preselected user ids
//   disabledIds   : array of user ids to render non-selectable (e.g. already assigned elsewhere)
//   noteFor       : function(user) -> string, an optional pill rendered on the row (e.g. a group name)
//   showSelectAll : add a "Select all" row (default false)
//   showAvatars   : render user avatars when available (default true)
//   emptyMessage  : message shown when no users match (default 'No users available.')
//   fetchUsers    : override the ApiClient.getUsers() source
//   onChange      : function(idsArray) called whenever the selection changes
// }
// The returned handle's setDisabled(ids) swaps the disabled set and re-renders, so a caller can keep the
// list in sync as state changes (for example, disabling users that just became members of another group).
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
        selectAllName.textContent = 'Select all';
        selectAllRow.appendChild(selectAllCheck);
        selectAllRow.appendChild(selectAllName);
        container.appendChild(selectAllRow);
        selectAllRow.classList.add('hidden');
    }

    var listEl = document.createElement('div');
    listEl.className = 'jpk-user-multi-list';
    container.appendChild(listEl);

    // Preselected ids persist across re-renders even if a user is temporarily filtered out of view.
    // Keyed by normalized id so a stored "N" GUID still matches an ApiClient "D" GUID.
    var selected = {};
    (options.value || []).forEach(function (id) { selected[idKey(id)] = true; });

    // Non-selectable users, keyed by normalized id. Swappable later via setDisabled().
    var disabled = {};
    (options.disabledIds || []).forEach(function (id) { disabled[idKey(id)] = true; });

    // The most recent rendered user list, so setDisabled() can re-render without refetching.
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
