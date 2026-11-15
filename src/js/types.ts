// types.ts
// The shapes the web components share, such as the helper bag, the page handle, and a paged result. Types only,
// so nothing here reaches the bundle.

import type { createShared } from './core.js';

/** The per view helper bag that createShared builds. */
export type Shared = ReturnType<typeof createShared>;

/** One dashboard tab, as LibraryMenu draws it. */
export interface Tab {
    href: string;
    name: string;
}

/** A tab list, or a function that returns one each time the tabs are shown. */
export type Tabs = Tab[] | (() => Tab[]);

/** What a component returns. The root element, and destroy when it holds a listener, an observer, or a timer. */
export interface ComponentHandle {
    element: HTMLElement;
    destroy?(): void;
}

/** A state name that badges.css tints. */
export type BadgeState = 'Active' | 'Synced' | 'Downloaded' | 'Imported' | 'Queued' | 'Downloading' | 'Pending' |
    'Pending-Download' | 'Pending-Replacement' | 'Errored' | 'Error' | 'Disabled' | 'Deleting' | 'Pending-Deletion' |
    'Expired' | 'Locked' | 'Admin' | 'Ignored' | 'Group' | 'Completed' | 'Enabled' | 'Failed' | 'Paused' | 'Running' |
    'Skipped' | 'Unknown';

/** A color modifier that jpk-badge takes. */
export type BadgeColor = 'green' | 'red' | 'orange' | 'purple' | 'blue' | 'gray' | 'yellow' | 'pink' | 'teal';

/** One page of rows, as the C# PagedResult serializes it. */
export interface PagedResult<T> {
    Items: T[];
    TotalCount: number;
    Page: number;
    PageSize: number;
    TotalPages: number;
    HasMore: boolean;
}

/** A repeating task from createPoller. A tick never starts while the last one is still running. */
export interface Poller {
    start(immediate?: boolean): void;
    stop(): void;
    isRunning(): boolean;
}

/** pauseWhenHidden skips ticks while the browser tab is hidden. */
export interface PollerOptions {
    pauseWhenHidden?: boolean;
}

/** Tracks unsaved changes against a snapshot, from createChangeTracker. */
export interface ChangeTracker {
    isDirty(): boolean;
    check(): boolean;
    markClean(): void;
    flashSaved(): void;
}

/** serialize reads the form as a string. The indicator shows while it differs from the snapshot. */
export interface ChangeTrackerOptions {
    serialize?: () => string;
    indicatorId?: string;
    indicator?: HTMLElement | null;
    savedText?: string;
}

/** An editor dialog whose unsaved edits count as the page's, such as one from openEditorDialog. */
export interface UnsavedEditor {
    isDirty(): boolean;
    close(): void;
}

/** What createConfigPage returns. A poller from createPoller and every cleanup stop on viewhide. */
export interface PageHandle {
    view: HTMLElement;
    shared: Shared;
    addCleanup<F>(fn: F): F;
    createPoller(fn: () => unknown, intervalMs?: number, opts?: PollerOptions): Poller;
    guardUnsaved(dirty: (() => boolean) | { isDirty(): boolean } | null, message?: string): void;
    trackEditor(dialog: UnsavedEditor): void;
    untrackEditor(dialog: UnsavedEditor): void;
}

/** What createConfigPage takes. bind runs once, load on every viewshow, and onHide on viewhide. */
export interface ConfigPageOptions {
    pluginId: string;
    apiPrefix?: string;
    tabsKey?: string;
    tabIndex?: number;
    tabs?: Tabs;
    bind?(shared: Shared, page: PageHandle): void;
    load?(shared: Shared, page: PageHandle): void;
    onHide?(shared: Shared, page: PageHandle): void;
    isDirty?(): boolean;
    leaveMessage?: string;
}

/** placeholder shows while a secret is stored. clearButton shows then too, and clears it. */
export interface SecretFieldOptions {
    placeholder?: string;
    clearButton?: HTMLElement | null;
}

/** One count card that renderCards draws. */
export interface CardData {
    count?: number | string | null;
    label?: string;
    color?: BadgeColor | string;
}

/** The status text saveConfigWith shows after a save. */
export interface SaveMessages {
    success?: string;
    error?: string;
}

/** The text copyWithFeedback shows on the button, and for how long in milliseconds. */
export interface CopyFeedbackOptions {
    copiedText?: string;
    failedText?: string;
    duration?: number;
}

/** An option in a searchable combo box. A plain value shows as its own label. */
export type ComboBoxItem = string | number | { value: unknown; label?: string };

/** What createSearchableComboBox takes. searchFn answers each query through its callback. */
export interface ComboBoxOptions {
    placeholder?: string;
    searchFn(query: string, callback: (results: ComboBoxItem[] | null) => void): void;
    onSelect?(value: unknown, item: ComboBoxItem): void;
    onInput?(): void;
}

/** What createSearchableComboBox returns. */
export interface ComboBoxHandle extends ComponentHandle {
    getValue(): unknown;
    setValue(value: unknown): void;
    destroy(): void;
}

/** What pollTaskProgress returns. cancel stops it and resets the button. */
export interface TaskProgressHandle {
    cancel(): void;
}

/** The parts of a Jellyfin scheduled task that pollTaskProgress reads. */
export interface ScheduledTaskInfo {
    Key: string;
    State: 'Idle' | 'Running' | 'Cancelling' | string;
    CurrentProgressPercentage?: number;
    LastExecutionResult?: { EndTimeUtc?: string } | null;
}
