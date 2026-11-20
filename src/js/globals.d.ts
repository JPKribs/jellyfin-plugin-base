// globals.d.ts
// The Jellyfin dashboard globals a config page may provide. Each is read only when present.

// JellyfinFetchOptions
// The request ApiClient.fetch sends.
interface JellyfinFetchOptions {
    url: string;
    type?: string;
    data?: string;
    contentType?: string;
    dataType?: string;
    headers?: Record<string, string>;
}

// ApiClient
// The dashboard's API client for the signed in server.
declare var ApiClient: {
    getUrl(path: string, params?: Record<string, unknown>): string;
    getCurrentUserId?(): string;
    fetch(options: JellyfinFetchOptions): Promise<any>;
    getJSON(url: string): Promise<any>;
    getUsers(query?: Record<string, unknown>): Promise<any[]>;
    getUserImageUrl(userId: string, options?: Record<string, unknown>): string;
    getImageUrl?(itemId: string, options?: Record<string, unknown>): string;
    getPluginConfiguration(pluginId: string): Promise<any>;
    updatePluginConfiguration(pluginId: string, config: unknown): Promise<any>;
    getScheduledTasks(query?: Record<string, unknown>): Promise<any[]>;
    sendMessage?(name: string, data?: unknown): void;
    sendWebSocketMessage?(name: string, data?: unknown): void;
} | undefined;

// LibraryMenu
// The dashboard's header menu, which draws a page's tabs.
declare var LibraryMenu: {
    setTabs(key: string, index: number, getTabs: () => Array<{ href: string; name: string }>): void;
} | undefined;

// Dashboard
// The dashboard's page helpers.
declare var Dashboard: {
    alert(message: string | { message?: string; title?: string }): void;
} | undefined;

// Events
// The dashboard's event bus, which relays WebSocket messages from ApiClient.
declare var Events: {
    on(target: unknown, name: string, handler: (e: unknown, data?: any) => void): void;
    off(target: unknown, name: string, handler: (e: unknown, data?: any) => void): void;
} | undefined;
