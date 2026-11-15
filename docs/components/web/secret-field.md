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
    <button is="emby-button" type="button" id="btnClearApiKey" class="raised jpk-secondary jpk-button-small hidden"><span>Clear</span></button>
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

* With a stored secret the placeholder is "Saved, leave blank to keep", which `opts.placeholder` replaces.
* `opts.clearButton` is shown while a secret is stored. Its click clears the secret, hides the button, and fires an `input` event.
* `readSecretField` returns the typed value when there is one, `''` after a clear, `SECRET_KEPT` for an empty field with a stored secret, and `''` otherwise.
* `SECRET_KEPT` is `__JPK_SECRET_KEPT__` and mirrors `SecretProtector.KeptSentinel`. Feed the posted value through `SecretProtector.ResolveIncoming` on the server.

## Gotchas

* Call `bindSecretField` after every load.
* The input must be a real input with a `dataset`.
* No kit CSS styles the clear button, so give it button classes yourself.

## Used By

Remote Access, Requests, and Scripts use it.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/secret-field.html" title="Secret Field example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "secret-field.html"
```
