# Preview Frame

A frame that shows an image made by an async `render`, such as a generated poster, built on the thumb core. While it renders it shows the [Spinner](spinner.md) and a status line, and a failed render shows a [Field Message](field-message.md). A pressed group picks a dark, light, or checkered background, and a click opens the image larger in a dialog.

## Decision

| When | Use |
| :--- | :--- |
| Fields that shape a generated image, so the reader sees the result as they type | Preview Frame, beside the fields |
| An image the reader chooses | [Image Picker](image-picker.md) |

## Usage

```js
import { createPreviewFrame } from './configurationpage?name=myplugin_jpkribs_shared.js';

var frame = createPreviewFrame({
    label: 'Poster preview',
    render: function () { return shared.apiRequest('Preview', 'POST', readForm()).then(function (r) { return r.Url; }); }
});
view.querySelector('#previewHost').appendChild(frame.element);
view.addEventListener('input', function () { frame.update(); });
```

Classes: `base-preview-frame`, with the `busy` modifier, and the parts `base-preview-frame-backgrounds`, `base-preview-frame-stage`, `base-preview-frame-image`, `base-preview-frame-status`, and `base-preview-frame-zoom`. The handle is `{ element, getValue, setValue, update, refresh, destroy }`.

## States and Modifiers

* `render` returns an address, a Blob, or a canvas, or a promise of one. A Blob shows through an object URL the frame frees.
* `update()` renders once its inputs stop changing for `delay` (300 milliseconds), and `refresh()` renders at once. A render that finishes after a newer one starts is dropped.
* `busy` is on the root while it renders, with the status line "Rendering…" (`renderingText`). An empty result shows "No preview." (`emptyText`), and a failure shows "Could not render the preview." (`errorText`).
* `background` is `dark` (default), `light`, or `checker`, chosen from the pills, whose labels `darkText`, `lightText`, and `checkerText` replace. `getValue` and `setValue` read and set it. `backgrounds: false` hides the choice. The dark and light backgrounds are the theme's surface and text colors.
* The stage is a button named "Zoom" (`zoomText`) and the label, which opens a large dialog titled by the label. `label` is the image's alt text, "Preview" by default. `zoom: false` makes it a plain frame.

## Gotchas

* Call `destroy()` when the page hides. It drops a pending update.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createPreviewFrame`

<code>function createPreviewFrame(options?: PreviewFrameOptions): PreviewFrameHandle</code>

A frame that shows an image made by an async render, such as a generated poster, built on the thumb core. While it renders it shows the spinner and a status line, and a failed render shows a message under it. update renders again once its inputs stop changing for the delay. A pressed group picks a dark, light, or checkered background, and a click on the image opens it larger in a dialog.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `render` | <code>(): PreviewResult &#124; PromiseLike&lt;PreviewResult&gt;</code> | function() returning an address, a Blob, or a canvas, or a promise of one [optional] |
| `label` | <code>string</code> | the image's alt text and the zoom dialog's title (default 'Preview') |
| `delay` | <code>number</code> | milliseconds update waits for its inputs to settle (default 300) |
| `background` | <code>PreviewBackground</code> | 'dark', 'light', or 'checker' (default 'dark') |
| `backgrounds` | <code>boolean</code> | false hides the background choice (default true) |
| `zoom` | <code>boolean</code> | false turns off click to zoom (default true) |
| `renderingText` | <code>string</code> | the status line while rendering (default 'Rendering…') |
| `errorText` | <code>string</code> | the message when render fails (default 'Could not render the preview.') |
| `emptyText` | <code>string</code> | the line while there is no image (default 'No preview.') |
| `darkText` | <code>string</code> | the dark background's label (default 'Dark') |
| `lightText` | <code>string</code> | the light background's label (default 'Light') |
| `checkerText` | <code>string</code> | the checkered background's label (default 'Checkered') |
| `zoomText` | <code>string</code> | the image button's title and aria-label (default 'Zoom') |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): PreviewBackground</code> |
| `setValue` | <code>(background: PreviewBackground): void</code> |
| `update` | <code>(): void</code> |
| `refresh` | <code>(): Promise&lt;void&gt;</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `PreviewBackground` | The background a preview frame shows its image on. |
| `PreviewResult` | What a preview frame's render may return: an address, a Blob, or a canvas, or a promise of one. |

| Class | What it looks like |
| :--- | :--- |
| `base-preview-frame` | A frame that shows a rendered image over a dark, light, or checkered background, with the background choice above it and a status line under it |
| `base-preview-frame-stage` | The stage the image sits on, a button that opens the zoom, as wide as its column and a fixed height, the image contained inside it |
| `base-preview-frame-stage.dark` | The three backgrounds: dark and light from the theme's text and surface, and a checkerboard of the wash for transparency |
| `base-preview-frame-zoom` | The image larger in the zoom dialog, on the same background, never wider than the dialog |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/preview-frame.html" title="Preview Frame example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "preview-frame.html"
```
