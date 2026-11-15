import { make, icon, nextId, listen, runAll, has, applyFieldSize, addToken, toText } from './lib/dom.js';
import { openDialog } from './dialog.js';
import type { DialogHandle } from './dialog.js';
import { createFieldMessage } from './field-message.js';
import { bindPressedGroup } from './lib/pressed-group.js';
import { createList } from './list.js';
import type { ListHeight, ListHandle } from './list.js';
import type { ComponentHandle } from './types.js';

/** One entry in a folder, as Jellyfin's Environment routes return it. Type is 'Directory', 'File', 'NetworkComputer', or 'NetworkShare'. */
export interface FolderEntry {
    Name: string;
    Path: string;
    Type?: string;
}

/** What createFolderPicker takes. listFolders and parentPath replace the Jellyfin Environment routes. */
export interface FolderPickerOptions {
    value?: string | null;
    label?: string;
    placeholder?: string;
    description?: string;
    pathLabel?: string;
    browseText?: string;
    title?: string;
    selectText?: string;
    cancelText?: string;
    upText?: string;
    loadingText?: string;
    emptyText?: string;
    errorText?: string;
    includeFiles?: boolean;
    height?: ListHeight;
    maxHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    listFolders?(path: string, includeFiles: boolean): FolderEntry[] | PromiseLike<FolderEntry[]>;
    parentPath?(path: string): string | null | PromiseLike<string | null>;
    onChange?(value: string): void;
}

/** What createFolderPicker returns. browse opens the dialog, and input is the path field. */
export interface FolderPickerHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string;
    setValue(value: string | null): void;
    browse(): void;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    destroy(): void;
}

var ICONS: Record<string, string> = { Directory: 'folder', File: 'insert_drive_file', NetworkComputer: 'computer', NetworkShare: 'folder_shared' };

// Finds the folder above a path from its text, where a drive root or / has none and gives the top level.
function textParent(path: string): string {
    var trimmed = path.replace(/[\\/]+$/, '');
    var cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
    if (cut < 0) return '';
    if (cut === 0) return trimmed.length > 1 ? '/' : '';
    var parent = trimmed.slice(0, cut);
    return /^[A-Za-z]:$/.test(parent) ? parent + '\\' : parent;
}

// Reads a folder through the dashboard's Environment routes, where the empty path lists the drives.
function apiList(path: string, includeFiles: boolean): Promise<FolderEntry[]> {
    if (typeof ApiClient === 'undefined' || !ApiClient) return Promise.reject(new Error('ApiClient is not available'));
    var url = path
        ? ApiClient.getUrl('Environment/DirectoryContents', { path: path, includeDirectories: true, includeFiles: includeFiles })
        : ApiClient.getUrl('Environment/Drives');
    return Promise.resolve(ApiClient.getJSON(url));
}

// Asks the server for the folder above a path. The answer is text, sometimes as a JSON string.
function apiParent(path: string): Promise<string | null> {
    if (typeof ApiClient === 'undefined' || !ApiClient) return Promise.resolve(textParent(path));
    return Promise.resolve(ApiClient.fetch({ url: ApiClient.getUrl('Environment/ParentPath', { path: path }), type: 'GET', dataType: 'text' })).then(function (text: unknown) {
        var value = toText(text);
        if (value.charAt(0) === '"') { try { value = JSON.parse(value); } catch (e) { /* keep the raw text */ } }
        return value || null;
    });
}

/**
 * A text field for a server path with a Browse button. Browse opens a dialog that lists the server's drives, then a folder's subfolders, with a row to go up a level, an editable path, and a Select button that writes the path to the field.
 *
 * @param options {
 *   value       : first path [optional]
 *   label       : visible label of the field [optional]
 *   placeholder : a valid example path [optional]
 *   description : sentence under the field [optional]
 *   pathLabel   : aria-label of the field without a label, and of the dialog's path field (default 'Path')
 *   browseText  : text of the browse button (default 'Browse')
 *   title       : dialog title (default 'Select a Folder')
 *   selectText  : text of the select button (default 'Select')
 *   cancelText  : text of the cancel button (default 'Cancel')
 *   upText      : text of the row that goes up a level (default 'Go Up')
 *   loadingText : text a screen reader reads while a folder loads (default 'Loading')
 *   emptyText   : sentence shown for a folder with nothing to list (default 'This folder is empty.')
 *   errorText   : message under the list when a folder cannot be read (default 'Could not read this folder.')
 *   includeFiles: true lists files too, so a file can be picked (default false)
 *   height      : the dialog list's height, 'auto', 'fill', a number of pixels, or a CSS length, as a List takes it (default 'auto')
 *   maxHeight   : the most the dialog list grows before it scrolls, or null for no cap (default '50vh')
 *   size        : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   listFolders : function(path, includeFiles) returning entries { Name, Path, Type }, or a promise of them, where '' is the top level (default the Jellyfin Environment routes) [optional]
 *   parentPath  : function(path) returning the path above, or '' or null for the top level (default Environment/ParentPath, or the path's text when listFolders is given) [optional]
 *   onChange    : function(value) called when the path changes by typing or Select [optional]
 * }
 * @returns { element, input, getValue, setValue, browse, setHeight, setSize, destroy }. browse() opens the dialog at the field's path, or at the top level when the field is empty.
 */
export function createFolderPicker(options?: FolderPickerOptions): FolderPickerHandle {
    options = options || {};
    var cleanups: Array<() => void> = [];
    var includeFiles = !!options.includeFiles;
    var pathLabel = options.pathLabel || 'Path';
    var dialog: DialogHandle | null = null;
    var listHeight: ListHeight = options.height === undefined ? 'auto' : options.height;
    var listMax: number | string | null | undefined = options.maxHeight === undefined ? '50vh' : options.maxHeight;
    var folderList: ListHandle<FolderEntry | null> | null = null;

    var root = make('div', 'base-folder-picker');
    applyFieldSize(root, options.size);
    var input = make('input', 'base-mono', { type: 'text', autocomplete: 'off', spellcheck: 'false' });
    input.id = nextId('folder');
    input.value = options.value ? String(options.value) : '';
    if (options.placeholder) input.setAttribute('placeholder', options.placeholder);
    if (options.label) {
        var label = make('label', 'base-folder-picker-label', { for: input.id }, options.label);
        root.appendChild(label);
    } else {
        input.setAttribute('aria-label', pathLabel);
    }
    var field = make('div', 'base-folder-picker-field');
    var browseButton = make('button', 'raised base-button field base-folder-picker-browse', { type: 'button' }, options.browseText || 'Browse');
    field.appendChild(input);
    field.appendChild(browseButton);
    root.appendChild(field);
    if (options.description) {
        var description = make('div', 'base-folder-picker-description', null, options.description);
        description.id = nextId('folder-description');
        addToken(input, 'aria-describedby', description.id);
        root.appendChild(description);
    }

    function list(path: string): Promise<FolderEntry[]> {
        try {
            if (options!.listFolders) return Promise.resolve(options!.listFolders(path, includeFiles));
            return apiList(path, includeFiles);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    function parentOf(path: string): Promise<string | null> {
        try {
            if (options!.parentPath) return Promise.resolve(options!.parentPath(path));
            if (options!.listFolders) return Promise.resolve(textParent(path));
            return apiParent(path);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    function setValue(value: string | null): void {
        input.value = toText(value);
    }

    function browse(): void {
        if (dialog) return;
        var current = '';
        var request = 0;
        var body = make('div', 'base-folder-picker-browser');
        var pathInput = make('input', 'base-mono base-folder-picker-path', { type: 'text', 'aria-label': pathLabel, autocomplete: 'off', spellcheck: 'false' });
        var rows = make('ul', 'base-folder-picker-list', { 'aria-label': options!.title || 'Select a Folder' });
        var message = createFieldMessage({ input: pathInput });
        var inner: Array<() => void> = [];

        function selectButton(): HTMLButtonElement | null {
            return dialog ? dialog.element.querySelector<HTMLButtonElement>('.base-folder-picker-select') : null;
        }

        function reflectSelect(): void {
            var button = selectButton();
            if (button) button.disabled = !pathInput.value.trim();
        }

        function row(className: string, iconName: string, text: string, onPick: () => void): HTMLButtonElement {
            var item = make('li');
            var button = make('button', 'base-folder-picker-entry base-icon-text' + (className ? ' ' + className : ''), { type: 'button' });
            button.appendChild(icon(iconName));
            button.appendChild(make('span', 'base-folder-picker-name', null, text));
            button.addEventListener('click', onPick);
            item.appendChild(button);
            return button;
        }

        // The up row is the null item, and every other item is an entry.
        function renderEntry(entry: FolderEntry | null): HTMLElement {
            if (!entry) return row('base-folder-picker-up', 'arrow_upward', options!.upText || 'Go Up', function () { goUp(); }).parentNode as HTMLElement;
            var isFile = entry.Type === 'File';
            var glyph = !current && entry.Type !== 'File' ? 'storage' : (has(ICONS, entry.Type) ? ICONS[entry.Type as string] : 'folder');
            var button = row(isFile ? 'base-folder-picker-file' : '', glyph, entry.Name || entry.Path, function () {
                if (isFile) pick(entry.Path);
                else go(entry.Path, true);
            });
            if (isFile) button.setAttribute('aria-pressed', 'false');
            return button.parentNode as HTMLElement;
        }

        // The list keeps the ul and its li rows, and owns the height, the loading line, and the empty sentence.
        var folders = folderList = createList<FolderEntry | null>({
            element: rows,
            layout: 'plain',
            wrap: false,
            role: null,
            emptyText: options!.emptyText || 'This folder is empty.',
            loadingText: options!.loadingText || 'Loading',
            height: listHeight,
            maxHeight: listMax,
            render: renderEntry
        });
        var empty = folders.emptyElement;
        empty.classList.add('base-folder-picker-empty');
        var files = bindPressedGroup(rows, { selector: '.base-folder-picker-file' });
        body.appendChild(pathInput);
        body.appendChild(rows);
        body.appendChild(empty);
        body.appendChild(message.element);

        function draw(entries: FolderEntry[], focusRows: boolean): void {
            var shown = (entries || []).filter(function (entry) { return entry && entry.Path && (includeFiles || entry.Type !== 'File'); });
            var items: Array<FolderEntry | null> = current ? [null] : [];
            folders.setItems(items.concat(shown));
            // The up row is an item, so the list alone would not call a folder with only the up row empty.
            empty.hidden = shown.length > 0;
            if (focusRows) {
                var first = rows.querySelector<HTMLButtonElement>('.base-folder-picker-entry');
                (first || pathInput).focus();
            }
        }

        // A picked file fills the path, and Select confirms it. The pressed group marks the button.
        function pick(path: string): void {
            pathInput.value = path;
            reflectSelect();
        }

        function go(path: string, focusRows: boolean): Promise<void> {
            var mine = ++request;
            current = path || '';
            pathInput.value = current;
            reflectSelect();
            message.clear();
            folders.setLoading(true);
            folders.setItems([]);
            rows.setAttribute('aria-busy', 'true');
            // Focus leaves with the removed row, so it waits in the path field until the rows return.
            if (focusRows) pathInput.focus();
            return list(current).then(function (entries) {
                if (mine !== request || !dialog) return;
                folders.setLoading(false);
                rows.removeAttribute('aria-busy');
                draw(Array.isArray(entries) ? entries : [], focusRows);
            }, function () {
                if (mine !== request || !dialog) return;
                folders.setLoading(false);
                rows.removeAttribute('aria-busy');
                draw([], false);
                empty.hidden = true;
                message.set('error', options!.errorText || 'Could not read this folder.');
            });
        }

        function goUp(): void {
            var from = current;
            parentOf(from).then(function (parent) {
                if (current === from && dialog) go(parent || '', true);
            }, function () {
                if (current === from && dialog) go(textParent(from), true);
            });
        }

        function choose(close: (value?: unknown) => void): void {
            var value = pathInput.value.trim();
            if (!value) return;
            var changed = value !== input.value;
            input.value = value;
            close(value);
            if (changed && options!.onChange) options!.onChange(value);
        }

        inner.push(listen(pathInput, 'keydown', function (e: KeyboardEvent) {
            if (e.key === 'Enter') { e.preventDefault(); go(pathInput.value.trim(), false); }
        }));
        inner.push(listen(pathInput, 'input', reflectSelect));

        dialog = openDialog({
            title: options!.title || 'Select a Folder',
            body: body,
            className: 'base-folder-picker-dialog',
            buttons: [
                { text: options!.cancelText || 'Cancel', className: 'base-button secondary', action: function (close, dismiss) { dismiss(); } },
                { text: options!.selectText || 'Select', className: 'base-button primary base-folder-picker-select', action: function (close) { choose(close); } }
            ],
            onClose: function () {
                runAll(inner);
                message.destroy();
                files.destroy();
                folders.destroy();
                folderList = null;
                dialog = null;
                request++;
                if (browseButton.isConnected) browseButton.focus();
            }
        });
        go(input.value.trim(), false);
    }

    cleanups.push(listen(browseButton, 'click', browse));
    cleanups.push(listen(input, 'input', function () {
        if (options!.onChange) options!.onChange(input.value);
    }));

    return {
        element: root,
        input: input,
        getValue: function () { return input.value; },
        setValue: setValue,
        browse: browse,
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        setHeight: function (height: ListHeight, maxHeight?: number | string | null) {
            listHeight = height;
            listMax = maxHeight;
            if (folderList) folderList.setHeight(height, maxHeight);
        },
        destroy: function () {
            runAll(cleanups);
            if (dialog) dialog.close();
        }
    };
}
