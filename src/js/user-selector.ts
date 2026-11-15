import { applyFieldSize } from './lib/dom.js';
import { idKey, loadUsers } from './lib/users.js';
import type { ComponentHandle } from './types.js';

/** A user after normalizeUser reads it, as the selectors draw it. */
export interface SelectorUser {
    id: string;
    name: string;
    isAdmin: boolean;
    imageTag: string | null;
}

/** A user record from ApiClient.getUsers() or a plugin DTO, in either PascalCase or camelCase. */
export interface RawUser {
    Id?: string;
    id?: string;
    Name?: string;
    name?: string;
    Policy?: { IsAdministrator?: boolean } | null;
    policy?: { IsAdministrator?: boolean } | null;
    IsAdministrator?: boolean;
    isAdmin?: boolean;
    PrimaryImageTag?: string | null;
    ImageTags?: { Primary?: string } | null;
}

/** Keeps everyone, hides administrators, or keeps only administrators. */
export type AdminFilter = 'all' | 'exclude' | 'only';

/** The options both selectors read to load the user list. */
export interface UserSource {
    adminFilter?: AdminFilter;
    fetchUsers?(): RawUser[] | { Items?: RawUser[] } | Promise<RawUser[] | { Items?: RawUser[] }>;
}

/** What createUserSelector takes. fetchUsers replaces ApiClient.getUsers(), and onChange hears the chosen id. */
export interface UserSelectorOptions extends UserSource {
    value?: string;
    includeEmptyOption?: boolean;
    emptyLabel?: string;
    showAdminBadge?: boolean;
    size?: 'small' | 'medium' | 'large';
    onChange?(userId: string): void;
}

/** What createUserSelector returns. ready and refresh resolve to the users drawn. */
export interface UserSelectorHandle extends ComponentHandle {
    ready: Promise<SelectorUser[]>;
    getValue(): string;
    setValue(id: string | null): void;
    refresh(): Promise<SelectorUser[]>;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

/**
 * Builds a single-user dropdown from the server's user list.
 *
 * @param options {
 *   adminFilter        : 'all' | 'exclude' | 'only', to keep everyone, hide administrators, or keep only administrators (default 'all')
 *   value              : preselected user id [optional]
 *   includeEmptyOption : add a none entry (default true)
 *   emptyLabel         : label for the none entry (default 'None')
 *   showAdminBadge     : append " (admin)" to administrator names (default true)
 *   fetchUsers         : function returning the user list, which replaces ApiClient.getUsers() [optional]
 *   size               : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   onChange           : function(userId) called on selection change [optional]
 * }
 * @returns { element, ready, getValue, setValue, refresh, setSize, destroy }.
 */
export function createUserSelector(options?: UserSelectorOptions): UserSelectorHandle {
    options = options || {};

    var container = document.createElement('div');
    container.className = 'base-selector base-user-selector';
    applyFieldSize(container, options.size);

    var select = document.createElement('select');
    select.className = 'base-selector-dropdown base-user-select';
    container.appendChild(select);

    var includeEmpty = options.includeEmptyOption !== false;
    var emptyLabel = options.emptyLabel || 'None';
    var showAdminBadge = options.showAdminBadge !== false;
    var pending = options.value || '';

    // Selects the option whose id matches, or the first option when none does.
    function selectByValue(value: string): void {
        var want = idKey(value);
        for (var i = 0; i < select.options.length; i++) {
            if (idKey(select.options[i].value) === want) { select.selectedIndex = i; return; }
        }
        select.selectedIndex = 0;
    }

    // Rebuilds the options and keeps the pending value selected.
    function render(users: SelectorUser[]): SelectorUser[] {
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
        setValue: function (id: string | null): void { pending = id || ''; selectByValue(pending); pending = select.value; },
        refresh: function (): Promise<SelectorUser[]> { return loadUsers(options).then(render); },
        setSize: function (size?: 'small' | 'medium' | 'large'): void { applyFieldSize(container, size); },
        destroy: function (): void { /* no document-level listeners */ }
    };
}
