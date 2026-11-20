import { idKey, loadUsers, avatarUrl } from './lib/users.js';
import { createCheckboxList } from './checkbox-list.js';
import type { SelectorUser, UserSource } from './user-selector.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** What createUserMultiSelector takes. noteFor gives a row its pill, and onChange hears the selected ids. */
export interface UserMultiSelectorOptions extends UserSource {
    value?: string[];
    disabledIds?: string[];
    noteFor?(user: SelectorUser): string | null | undefined;
    search?: boolean;
    placeholder?: string;
    showSelectAll?: boolean;
    selectAllText?: string;
    showAvatars?: boolean;
    showAdminBadge?: boolean;
    adminText?: string;
    emptyMessage?: string;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    onChange?(ids: string[]): void;
}

/** What createUserMultiSelector returns. setDisabled swaps the disabled ids and re-renders without refetching. */
export interface UserMultiSelectorHandle extends ComponentHandle {
    ready: Promise<SelectorUser[]>;
    getValue(): string[];
    setValue(ids: string[] | null): void;
    setDisabled(ids: string[] | null): void;
    refresh(): Promise<SelectorUser[]>;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

/**
 * A checkbox list of the server's users, for picking many. It is a checkbox list whose items are the users, each row
 * showing the user's avatar, name, an Admin badge, and an optional note, and whose ids match whatever their case or dashes.
 *
 * @param options {
 *   adminFilter    : 'all' | 'exclude' | 'only', to keep everyone, hide administrators, or keep only administrators (default 'all')
 *   value          : array of preselected user ids [optional]
 *   disabledIds    : array of user ids to render non-selectable, such as users already assigned elsewhere [optional]
 *   noteFor        : function(user) returning a string for a pill on the row, such as a group name [optional]
 *   search         : show a search box (default false)
 *   placeholder    : search box placeholder (default 'Search')
 *   showSelectAll  : add a select all row (default false)
 *   selectAllText  : the label of the select all row (default 'Select all')
 *   showAvatars    : show each user's avatar, or the person icon when they have no picture (default true)
 *   showAdminBadge : show an Admin badge on administrators (default true)
 *   adminText      : the Admin badge's text (default 'Admin')
 *   emptyMessage   : message shown when no users match (default 'No users available.')
 *   height         : the rows' height, 'auto', 'fill', a number of pixels, or a CSS length, as a List takes it (default 'auto')
 *   maxHeight      : the most the rows grow before they scroll [optional]
 *   minHeight      : the least a filling list takes [optional]
 *   size           : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   fetchUsers     : function returning the user list, which replaces ApiClient.getUsers() [optional]
 *   onChange       : function(idsArray) called whenever the selection changes [optional]
 * }
 * @returns { element, ready, getValue, setValue, setDisabled, refresh, setHeight, destroy }.
 */
export function createUserMultiSelector(options?: UserMultiSelectorOptions): UserMultiSelectorHandle {
    var opts = options || {};
    var showAvatars = opts.showAvatars !== false;
    var showAdminBadge = opts.showAdminBadge !== false;

    var list = createCheckboxList({
        fetchItems: function () { return loadUsers(opts); },
        idKey: function (user: SelectorUser) { return user.id; },
        matchKey: idKey,
        value: opts.value,
        disabledIds: opts.disabledIds,
        search: !!opts.search,
        placeholder: opts.placeholder,
        searchKeys: ['name'],
        showSelectAll: opts.showSelectAll,
        selectAllText: opts.selectAllText,
        emptyMessage: opts.emptyMessage || baseText('Base.NoUsers'),
        height: opts.height,
        maxHeight: opts.maxHeight === undefined ? null : opts.maxHeight,
        minHeight: opts.minHeight,
        size: opts.size,
        renderRow: function (user: SelectorUser) {
            return {
                label: user.name,
                avatar: showAvatars ? { src: avatarUrl(user), name: user.name } : null,
                badge: showAdminBadge && user.isAdmin ? { label: opts.adminText || baseText('Base.Admin'), color: 'blue' } : null,
                note: opts.noteFor ? opts.noteFor(user) : null
            };
        },
        onChange: opts.onChange
    });
    list.element.classList.add('base-user-multi');

    return {
        element: list.element,
        ready: list.ready as Promise<SelectorUser[]>,
        getValue: list.getValue,
        setValue: function (ids) { list.setValue(ids); },
        setDisabled: function (ids) { list.setDisabled(ids); },
        refresh: function () { return list.refresh() as Promise<SelectorUser[]>; },
        setHeight: list.setHeight,
        destroy: list.destroy
    };
}
