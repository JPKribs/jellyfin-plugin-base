# Folder Picker

A text field for a server path with a Browse button. Browse opens a dialog that lists the server's drives, then a folder's subfolders, with a row to go up a level, an editable path, and a Select button that writes the path to the field.

## Decision

| When | Use |
| :--- | :--- |
| A folder or file on the Jellyfin server, such as a media folder or an export path | Folder Picker |
| A file from the user's own computer | [File Picker](file-picker.md) |
| An image from the user's own computer | [Image Picker](image-picker.md) |

## Usage

```js
import { createFolderPicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var folder = createFolderPicker({
    label: 'Media Folder',
    placeholder: '/media/movies',
    value: config.MediaPath,
    onChange: function (value) { config.MediaPath = value; tracker.check(); }
});
container.appendChild(folder.element);
```

Classes: `base-folder-picker`, `base-folder-picker-field`, `base-folder-picker-browser`, `base-folder-picker-list`, `base-folder-picker-entry`. The handle is `{ element, input, getValue, setValue, browse, setHeight, setSize, destroy }`.

Parts: `base-folder-picker-label`, `base-folder-picker-description`, `base-folder-picker-browse`, `base-folder-picker-dialog`, `base-folder-picker-path`, `base-folder-picker-up`, `base-folder-picker-file`, `base-folder-picker-name`, `base-folder-picker-empty`, `base-folder-picker-select`.

## States and Modifiers

* By default it reads `Environment/Drives`, `Environment/DirectoryContents`, and `Environment/ParentPath` through `ApiClient`. These are admin routes, so the field suits a config page.
* `listFolders(path, includeFiles)` replaces the routes and returns entries `{ Name, Path, Type }`, or a promise of them. The empty path is the top level. `parentPath(path)` returns the path above, and `''` or `null` means the top level. With `listFolders` and no `parentPath`, the parent comes from the path's text.
* `includeFiles: true` lists files too. A click on a file fills the path and marks that row alone `selected` with `aria-pressed`, and Select confirms it.
* Each row is a button built as `base-icon-text`, so its icon lines up with the first line of a long name.
* The dialog opens at the field's path, or at the top level when the field is empty. Select stays disabled while the path is empty.
* Rows are buttons, so Enter and Space open a folder. Enter in the path field opens the typed path. Escape closes the dialog, and focus returns to Browse.
* The dialog's rows are a [List](list.md), so `height` and `maxHeight` take what a List takes, and `setHeight(height, maxHeight)` changes them later. `maxHeight` is `'50vh'` by default, and `null` removes the cap.
* The List's loading line shows in the list while a folder loads. A folder with nothing to list shows the List's empty sentence, `base-list-empty outside`, under the list. A folder that cannot be read shows the error under the list instead, and the up row stays.
* The defaults are "Browse" (`browseText`), "Select a Folder" (`title`), "Select" (`selectText`), "Cancel" (`cancelText`), "Go Up" (`upText`), "Path" (`pathLabel`), "Loading" (`loadingText`), "This folder is empty." (`emptyText`), and "Could not read this folder." (`errorText`).
* `onChange(value)` runs on typing and on a Select that changes the path. `setValue` does not call it.
* `size` is `small`, `medium` (default), or `large`, and sizes its fields on the [size scale](design-tokens.md). `setSize(size)` changes it later.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createFolderPicker`

<code>function createFolderPicker(options?: FolderPickerOptions): FolderPickerHandle</code>

A text field for a server path with a Browse button. Browse opens a dialog that lists the server's drives, then a folder's subfolders, with a row to go up a level, an editable path, and a Select button that writes the path to the field.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string &#124; null</code> | first path [optional] |
| `label` | <code>string</code> | visible label of the field [optional] |
| `placeholder` | <code>string</code> | a valid example path [optional] |
| `description` | <code>string</code> | sentence under the field [optional] |
| `pathLabel` | <code>string</code> | aria-label of the field without a label, and of the dialog's path field (default 'Path') |
| `browseText` | <code>string</code> | text of the browse button (default 'Browse') |
| `title` | <code>string</code> | dialog title (default 'Select a Folder') |
| `selectText` | <code>string</code> | text of the select button (default 'Select') |
| `cancelText` | <code>string</code> | text of the cancel button (default 'Cancel') |
| `upText` | <code>string</code> | text of the row that goes up a level (default 'Go Up') |
| `loadingText` | <code>string</code> | text a screen reader reads while a folder loads (default 'Loading') |
| `emptyText` | <code>string</code> | sentence shown for a folder with nothing to list (default 'This folder is empty.') |
| `errorText` | <code>string</code> | message under the list when a folder cannot be read (default 'Could not read this folder.') |
| `includeFiles` | <code>boolean</code> | true lists files too, so a file can be picked (default false) |
| `height` | <code>ListHeight</code> | the dialog list's height, 'auto', 'fill', a number of pixels, or a CSS length, as a List takes it (default 'auto') |
| `maxHeight` | <code>number &#124; string &#124; null</code> | the most the dialog list grows before it scrolls, or null for no cap (default '50vh') |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `listFolders` | <code>(path: string, includeFiles: boolean): FolderEntry[] &#124; PromiseLike&lt;FolderEntry[]&gt;</code> | function(path, includeFiles) returning entries { Name, Path, Type }, or a promise of them, where '' is the top level (default the Jellyfin Environment routes) [optional] |
| `parentPath` | <code>(path: string): string &#124; null &#124; PromiseLike&lt;string &#124; null&gt;</code> | function(path) returning the path above, or '' or null for the top level (default Environment/ParentPath, or the path's text when listFolders is given) [optional] |
| `onChange` | <code>(value: string): void</code> | function(value) called when the path changes by typing or Select [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(value: string &#124; null): void</code> |
| `browse` | <code>(): void</code> |
| `setSize` | <code>(size?: 'small' &#124; 'medium' &#124; 'large'): void</code> |
| `setHeight` | <code>(height: ListHeight, maxHeight?: number &#124; string &#124; null): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `FolderEntry` | One entry in a folder, as Jellyfin's Environment routes return it. Type is 'Directory', 'File', 'NetworkComputer', or 'NetworkShare'. |

| Class | What it looks like |
| :--- | :--- |
| `base-folder-picker` | A path field with a Browse button beside it, a label above, and a description below |
| `base-folder-picker-browser` | Dialog body with the editable path, the list of folders with its loading line, the list's empty sentence, and the error |
| `base-folder-picker-entry` | One folder, drive, or file in the list as a full width button built as base-icon-text, with the up row first |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/folder-picker.html" title="Folder Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "folder-picker.html"
```
