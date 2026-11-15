# File Picker

A drop zone that is also a button. The user clicks it, presses Enter or Space, or drops files on it. Files that do not match `accept` or `maxSize` are refused with a message, and the rest are listed with a Remove button.

## When to Use

* Use it to choose files to upload, such as a logo or a cover.

## When Not to Use

* Use an [Asset List](asset-list.md) to show files already stored.

## Usage

```js
import { createFilePicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var picker = createFilePicker({ accept: 'image/*', maxSize: 2097152, multiple: true, onChange: function (files) { upload(files); } });
container.appendChild(picker.element);
```

Classes: `jpk-file-picker`, `jpk-file-zone`, `jpk-file-list`, `jpk-file-item`. The handle is `{ element, input, getValue, setValue, clear, destroy }`.

Parts: `jpk-file-name`, `jpk-file-size`.

## States and Modifiers

* `getValue()` returns an array of `File` objects. In single mode a new file replaces the old one.
* `accept` is an accept list such as `'image/*,.png'`. `maxSize` is the most bytes one file may have, and the size limit follows the size message in parentheses, such as (2 MB).
* The zone has `role="button"` and `tabindex="0"`. The `dragover` modifier shows the accent.
* `dropText` is "Drop files here or click to choose." by default. `typeText`, `sizeLimitText`, and `singleText` replace the refusal messages, and `{value}` is the file name.
* `onChange(files)` runs after each change. `onError(messages)` runs with the refusal messages.
* `jpk-file-list` is hidden while empty.

## Used By

No plugin uses it today. Custom Pages (asset upload), Live Channels (logo upload), and YouTube Audio (cover and playlist files) hand build a file input.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/file-picker.html" title="File Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "file-picker.html"
```
