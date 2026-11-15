# QR Code

A QR code of a short text, such as a URL, drawn as SVG on the surface in a rounded style: a round dot in the text color for each dark module, and the three corner eyes as rounded squares in the accent color. Copy Image and Download give it as a PNG, and the text sits under it as a [Copy Field](copy-field.md).

## When to Use

* Use it to hand a link to a phone, such as an invite or a pairing address.

## When Not to Use

* Never use it for a secret. Anyone who sees the screen can scan it.

## Usage

```js
import { createQrCode } from './configurationpage?name=myplugin_jpkribs_shared.js';

var qr = createQrCode({ value: inviteUrl, label: 'QR code for the invite link' });
view.querySelector('#qrHost').appendChild(qr.element);
```

The handle is `{ element, getValue, setValue, toBlob, destroy }`. `toBlob()` resolves to a PNG of the code, or null.

## States and Modifiers

* The encoder is part of Base, so it needs no library. It uses byte mode at error correction level M, versions 1 to 10, which hold up to 213 bytes.
* A longer text shows "This text is too long for a QR code." under the frame, which `tooLongText` replaces, and hides the code.
* Copy Image copies a PNG to the clipboard where the browser allows it, and its label shows "Copied." or "Copy failed." for `feedbackMs`, 1500 milliseconds by default. `copyImageText`, `downloadText`, `copiedText`, and `copyFailedText` replace the labels. Download saves `fileName` ("qr-code.png").
* On a wide line the code sits on the left, with Copy Image and Download as two equal buttons over the Copy Field filling the space beside it, level with the code's bottom edge. When the component is narrower than 480px, it stacks: the code the full width, then the buttons and the text under it.
* The PNG takes the shapes and colors the code shows on the page, drawn at 12 pixels per module so the dots stay smooth.
* The eyes take `--base-accent`. A page can restyle them with `.base-qr-code-eyes { fill: ... }`, and the PNG follows.
* `showValue: false` hides the Copy Field.
* The frame is an image named by `label`, or "QR code for" and the text.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createQrCode`

<code>function createQrCode(options?: QrCodeOptions): QrCodeHandle</code>

A QR code of a short text, such as a URL, drawn as SVG in the text color on the surface in a rounded style: round dots, and rounded finder eyes in the accent color, with Copy Image and Download buttons for a PNG and the text under it as a Copy Field. It encodes in byte mode at error correction level M, up to 213 bytes, and shows a message under the frame for a longer text.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `value` | <code>string</code> | the text the code holds, such as a URL [optional] |
| `label` | <code>string</code> | the code's accessible name (default 'QR code for' and the text) |
| `showValue` | <code>boolean</code> | false hides the Copy Field under the code (default true) |
| `fileName` | <code>string</code> | the name of the downloaded PNG (default 'qr-code.png') |
| `copyImageText` | <code>string</code> | the copy button's label (default 'Copy Image') |
| `downloadText` | <code>string</code> | the download button's label (default 'Download') |
| `copiedText` | <code>string</code> | the feedback after a copy (default 'Copied.') |
| `copyFailedText` | <code>string</code> | the feedback when the browser refused the copy (default 'Copy failed.') |
| `tooLongText` | <code>string</code> | the message for a text too long to encode (default 'This text is too long for a QR code.') |
| `feedbackMs` | <code>number</code> | how long the feedback stays (default 1500) |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string</code> |
| `setValue` | <code>(value: string &#124; null): void</code> |
| `toBlob` | <code>(): Promise&lt;Blob &#124; null&gt;</code> |
| `destroy` | <code>(): void</code> |

| Class | What it looks like |
| :--- | :--- |
| `base-qr-code.compact` | A narrow QR code stacks: the code the full width, then the buttons and the text under it at the same width |
| `base-qr-code-actions` | The Copy Image and Download buttons, two equal halves of a button row the code's width, a field tall like the Copy Field under them |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/qr-code.html" title="QR Code example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "qr-code.html"
```
