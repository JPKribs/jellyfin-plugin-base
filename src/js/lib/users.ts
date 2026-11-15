// users.ts
// Loads and normalizes the server's user list for the user selector and the user multi selector. None of them is exported from the bundle.

import type { SelectorUser, RawUser, AdminFilter, UserSource } from '../user-selector.js';

/** Normalizes an id for comparison, so GUIDs that differ only by case or dashes still match, such as an "N" format id against a "D" format one. */
export function idKey(id: unknown): string {
    return String(id === null || id === undefined ? '' : id).replace(/-/g, '').toLowerCase();
}

// Normalizes a raw record from ApiClient.getUsers() or a plugin DTO to { id, name, isAdmin, imageTag }.
function normalizeUser(raw: RawUser): SelectorUser {
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
function applyAdminFilter(users: SelectorUser[], mode: AdminFilter): SelectorUser[] {
    if (mode === 'exclude') return users.filter(function (u) { return !u.isAdmin; });
    if (mode === 'only') return users.filter(function (u) { return u.isAdmin; });
    return users;
}

// Fetches the raw user list from options.fetchUsers, else ApiClient.getUsers, else a GET of Users, else an empty list.
function fetchRawUsers(options: UserSource): Promise<RawUser[] | { Items?: RawUser[] }> {
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

/** Resolves, normalizes, filters, and sorts the user list by name, giving an empty list when the fetch fails. */
export function loadUsers(options: UserSource): Promise<SelectorUser[]> {
    return fetchRawUsers(options).then(function (raw) {
        // A source may return a plain array or a paged { Items } envelope.
        var list = Array.isArray(raw) ? raw : (raw && raw.Items) || [];
        var users = list.map(normalizeUser);
        users = applyAdminFilter(users, options.adminFilter || 'all');
        users.sort(function (a, b) { return a.name.localeCompare(b.name); });
        return users;
    }).catch(function () { return []; });
}

/** Returns the avatar URL for a user, or null when the user has no image or ApiClient cannot build one. */
export function avatarUrl(user: SelectorUser): string | null {
    if (!user.imageTag || typeof ApiClient === 'undefined' || !ApiClient.getUserImageUrl) return null;
    try {
        return ApiClient.getUserImageUrl(user.id, { tag: user.imageTag, type: 'Primary', height: 56 });
    } catch (e) {
        return null;
    }
}
