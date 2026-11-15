# Secret Field

The browser half of `SecretProtector`. A credential input that never receives the stored secret.

## When to Use

* Use it for every API key, password, and token a plugin stores.

## When Not to Use

* Never put the stored secret into the page. The server sends only whether one is stored.

## Usage

```html
<div class="inputContainer">
    <label for="txtApiKey">API Key</label>
    <input is="emby-input" type="password" id="txtApiKey" />
    <button is="emby-button" type="button" id="btnClearApiKey" class="raised base-button secondary small hidden"><span>Clear</span></button>
</div>
```

```js
import { bindSecretField, readSecretField, SECRET_KEPT } from './configurationpage?name=myplugin_jpkribs_shared.js';

// After every load, since a save may change whether a secret is stored.
bindSecretField(view.querySelector('#txtApiKey'), config.HasApiKey, { clearButton: view.querySelector('#btnClearApiKey') });

// On save: SECRET_KEPT when untouched, '' after a clear, otherwise the typed value.
config.ApiKey = readSecretField(view.querySelector('#txtApiKey'));
```

The same three functions are on the bag and take an id or an element. `clearSecretField(input)` empties the field and marks the stored secret to clear on the next save.

## States and Modifiers

* A field shows one of three things. With nothing stored it shows its own placeholder, the help text. With a value typed in, it shows the browser's regular dots. With a stored secret the field shows eight dots in secondary gray, so it reads as filled though the browser never has the value. Its title says "Saved, leave blank to keep", which `opts.placeholder` replaces. Typing replaces the dots.
* `opts.allowExpose: true` adds an eye inside the box that shows and hides what was typed. It is off by default.
* `opts.clearButton` is shown while a secret is stored. Its click clears the secret, hides the button, and fires an `input` event.
* `readSecretField` returns the typed value when there is one, `''` after a clear, `SECRET_KEPT` for an empty field with a stored secret, and `''` otherwise.
* `SECRET_KEPT` is `__JPK_SECRET_KEPT__` and mirrors `SecretProtector.KeptSentinel`. Feed the posted value through `SecretProtector.ResolveIncoming` on the server.
* `SECRET_DOTS` is the eight dots a stored secret shows.
* A stored secret counts as filled for a `required` rule of the [validation core](field-message.md#validation), until it is cleared.

## Gotchas

* Call `bindSecretField` after every load.
* The input must be a real input with a `dataset`.
* No kit CSS styles the clear button, so give it button classes yourself.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `SECRET_KEPT`

<code>var SECRET_KEPT: string</code>

Sentinel a config page posts back in a secret field to keep the stored value, so the real secret never travels to the browser. It mirrors SecretProtector.KeptSentinel, and the C# side reads the posted value through SecretProtector.ResolveIncoming.

### `SECRET_DOTS`

<code>var SECRET_DOTS: string</code>

The dots a field shows while a secret is stored, so it reads as filled though the browser never gets the value.

### `bindSecretField`

<code>function bindSecretField(input: HTMLInputElement &#124; null, hasStored: boolean, opts?: SecretFieldOptions): void</code>

Prepares a secret input so the stored secret never reaches the browser. While a secret is stored the field is empty and shows eight dots, so it reads as filled, with a hint in its title. Call it after every load, since a save may change whether a secret is stored.

### `clearSecretField`

<code>function clearSecretField(input: HTMLInputElement &#124; null): void</code>

Marks a bound secret field to clear the stored secret on the next save, since an empty field otherwise keeps it.

### `readSecretField`

<code>function readSecretField(input: HTMLInputElement &#124; null): string</code>

Returns the value to post for a bound secret field. That is SECRET_KEPT when it is empty and a secret is stored, '' after clearSecretField, and otherwise the typed replacement.

| Class | What it looks like |
| :--- | :--- |
| `base-secret-stored` | A secret field with a stored secret, whose eight placeholder dots show in secondary gray, since the value is not in the page |

<!-- reference:end -->

## Used By

Custom Pages, Remote Access, Requests, Scripts, and Server Sync use it.

## Example

<iframe class="base-preview" src="../../../assets/previews/secret-field.html" title="Secret Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "secret-field.html"
```
