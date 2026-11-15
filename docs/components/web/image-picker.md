# Image Picker

Picks an image file, shows it in a frame, and hands the caller the file data. It never uploads, so the caller sends the data where it belongs.

## Decision

| When | Use |
| :--- | :--- |
| One image the user chooses from their computer, such as a logo, a poster, or a backdrop | Image Picker |
| Files that are not images, or several files | [File Picker](file-picker.md) |
| Showing a user's picture | [Avatar](avatar.md) |

## Usage

```js
import { createImagePicker } from './configurationpage?name=myplugin_jpkribs_shared.js';

var logo = createImagePicker({
    label: 'Logo',
    value: config.LogoUrl,
    maxBytes: 1048576,
    onChange: function (value) { pendingLogo = value; tracker.check(); }
});
container.appendChild(logo.element);
```

Classes: `base-image-picker`, `base-image-picker-body`, `base-image-picker-frame`, `base-image-picker-actions`. The handle is `{ element, input, getValue, setValue, fallbackDataUrl, destroy }`.

Parts: `base-image-picker-label`, `base-image-picker-image`, `base-image-picker-placeholder`, `base-image-picker-empty`, `base-image-picker-fallback`, `base-image-picker-choose`, `base-image-picker-remove`, `base-image-picker-description`.

## States and Modifiers

* `shape` is `square` (default), `portrait`, or `wide`, and sits on the root as a modifier. `filled` is on the root while an image shows.
* `onChange(value)` runs with `{ name, type, size, dataUrl, base64 }` after a pick, and with `null` after Remove. `base64` is the data after the comma of `dataUrl`.
* `getValue()` returns the picked file's data, the URL string while it shows a URL from `value` or `setValue`, or `null` while empty. `setValue(url)` does not call `onChange`.
* `accept` is "image/*" by default. A file that does not match it, or is larger than `maxBytes`, is refused with a message under the field, and the old image stays.
* The defaults are "Select Image" (`chooseText`), "Replace" (`replaceText`), "Remove" (`removeText`), "No image." (`emptyText`), "The image is larger than {value}." (`tooLargeText`, where `{value}` is the limit such as 2 MB), "This file is not an image." (`wrongTypeText`), and "Could not read this file." (`readErrorText`).
* Remove moves focus to the choose button.
* `crop: true` crops a picked image from its center to the frame's shape, and a number crops it to that width over height. `maxSize` scales the longer side down to that many pixels, never up. Either one draws the image on a canvas, keeps a PNG, JPEG, or WebP type and makes anything else a PNG, and adds `width` and `height` to the value.
* `fallback: { text, icon, color }` fills the empty frame with the initials of `text`, such as "AL" for Ada Lovelace, or else `icon`, on a status color or hex code (default blue). `fallbackDataUrl(size)` draws it as a square PNG data URL, so a page can save it as the image, and returns `''` without a fallback. `initials(text)` is exported on its own.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createImagePicker`

<code>function createImagePicker(options?: ImagePickerOptions): ImagePickerHandle</code>

Picks an image file, shows it in a frame, and hands the caller the file data. It never uploads. The frame shows a placeholder icon while empty, and a refused or unreadable file shows a message under the field.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string &#124; null</code> | a URL or data URL to show at first [optional] |
| `label` | <code>string</code> | visible label above the frame [optional] |
| `description` | <code>string</code> | sentence under the field [optional] |
| `accept` | <code>string</code> | accept list of the file input (default 'image/*') |
| `maxBytes` | <code>number</code> | most bytes the file may have [optional] |
| `chooseText` | <code>string</code> | text of the choose button while empty (default 'Select Image') |
| `replaceText` | <code>string</code> | text of the choose button while an image shows (default 'Replace') |
| `removeText` | <code>string</code> | text of the remove button (default 'Remove') |
| `emptyText` | <code>string</code> | text in the empty frame (default 'No image.') |
| `tooLargeText` | <code>string</code> | message for a file over maxBytes, where {value} is the limit (default 'The image is larger than {value}.') |
| `wrongTypeText` | <code>string</code> | message for a file that does not match accept (default 'This file is not an image.') |
| `readErrorText` | <code>string</code> | message when the file cannot be read (default 'Could not read this file.') |
| `shape` | <code>'square' &#124; 'portrait' &#124; 'wide'</code> | frame shape, 'square', 'portrait', or 'wide' (default 'square') |
| `crop` | <code>boolean &#124; number</code> | true crops a picked image from its center to the frame's shape, or a number crops it to that width over height (default false) |
| `maxSize` | <code>number</code> | the longest side in pixels a picked image is scaled down to [optional] |
| `fallback` | <code>ImagePickerFallback &#124; null</code> | { text, icon, color } drawn in the empty frame, initials from text or else an icon, on a status color or hex code (default blue) [optional] |
| `onChange` | <code>(value: ImagePickerValue &#124; null): void</code> | function(value) called with { name, type, size, dataUrl, base64 } after a pick, and null after Remove [optional] |

| Handle member | Type |
| :--- | :--- |
| `input` | <code>HTMLInputElement</code> |
| `getValue` | <code>(): ImagePickerValue &#124; string &#124; null</code> |
| `setValue` | <code>(url: string &#124; null): void</code> |
| `fallbackDataUrl` | <code>(size?: number): string</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `ImagePickerValue` | A picked image file. dataUrl is the whole data URL, and base64 is only its data after the comma. |
| `ImagePickerFallback` | The picture an empty image picker shows: initials from text, or an icon, on a color. |

| Class | What it looks like |
| :--- | :--- |
| `base-image-picker` | An image frame in a square, portrait, or wide shape beside its Select Image and Remove buttons |
| `base-image-picker-frame` | The base-thumb frame that holds the preview, or the placeholder icon and text while empty |
| `base-image-picker-fallback` | The picture an empty picker shows in place of its placeholder: initials or an icon on a status color over the surface, filling the frame |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/image-picker.html" title="Image Picker example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "image-picker.html"
```
