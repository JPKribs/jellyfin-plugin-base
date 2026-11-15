# File Picker

A drop zone that is also a button. The user clicks it, presses Enter or Space, or drops files on it. Files that do not match `accept` or `maxSize` are refused with a message, and the rest are listed with a Remove button.

## When to Use

* Use it to choose files to upload, such as a logo or a cover.

## When Not to Use

* Use an [Asset List](asset-list.md) to show files already stored.
* Use an [Image Picker](image-picker.md) for one image with a preview, and a [Folder Picker](folder-picker.md) for a path on the server.

## Usage

```js
import { createFilePicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var picker = createFilePicker({ accept: 'image/*', maxSize: 2097152, multiple: true, onChange: function (files) { upload(files); } });
container.appendChild(picker.element);
```

Classes: `base-file-picker`, `base-file-zone`, `base-file-list`, `base-file-item`. The handle is `{ element, input, getValue, setValue, clear, destroy }`.

Parts: `base-file-name`, `base-file-size`.

## States and Modifiers

* `getValue()` returns an array of `File` objects. In single mode a new file replaces the old one.
* `accept` is an accept list such as `'image/*,.png'`. `maxSize` is the most bytes one file may have, and the size limit follows the size message in parentheses, such as (2 MB).
* The zone has `role="button"` and `tabindex="0"`, and is built as `base-icon-text`, so its icon lines up with the first line of the text. The `dragover` modifier shows the accent.
* `dropText` is "Drop files here or click to select." by default. `typeText`, `sizeLimitText`, and `singleText` replace the refusal messages, and `{value}` is the file name.
* The refusal messages show together under the zone as an error [Field Message](field-message.md).
* `onChange(files)` runs after each change. `onError(messages)` runs with the refusal messages.
* `base-file-list` is a [List](list.md) of `base-item-row` rows, with no empty sentence, and is hidden while empty. Remove moves focus to the next Remove button, the one before it, or the zone.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createFilePicker`

<code>function createFilePicker(options?: FilePickerOptions): FilePickerHandle</code>

A drop zone that is also a button. The user clicks it, presses Enter or Space, or drops files on it. Files that do not match accept or maxSize are refused with a message, and the rest are listed with a Remove button.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `accept` | <code>string</code> | accept list such as 'image/*,.png' [optional] |
| `maxSize` | <code>number</code> | most bytes one file may have [optional] |
| `multiple` | <code>boolean</code> | true allows several files (default false) |
| `dropText` | <code>string</code> | text in the zone (default 'Drop files here or click to select.') |
| `removeLabel` | <code>string</code> | aria-label of a remove button, where {value} is the file name (default 'Remove {value}') |
| `typeText` | <code>string</code> | message for a file of the wrong type, where {value} is its name (default '{value} is not an accepted type.') |
| `sizeLimitText` | <code>string</code> | message for a file over maxSize, where {value} is its name (default '{value} is larger than the size limit.') |
| `singleText` | <code>string</code> | message when several files were dropped and multiple is off (default 'Select one file.') |
| `onChange` | <code>(files: File[]): void</code> | function(files) called with the File objects after each change [optional] |
| `onError` | <code>(messages: string[]): void</code> | function(messages) called with the refusal messages [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): File[]</code> |
| `setValue` | <code>(next?: File[] &#124; null): void</code> |
| `clear` | <code>(): void</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-file-picker` | Drop zone that is also a button, with a list of the chosen files under it |
| `base-file-list` | One chosen file with its name, size, and remove button |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/file-picker.html" title="File Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "file-picker.html"
```
