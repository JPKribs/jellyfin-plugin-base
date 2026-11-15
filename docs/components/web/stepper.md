# Stepper

A row of numbered steps for a flow of several stages. Steps before the current one are completed and later ones are upcoming.

## When to Use

* Use it to show where the reader is in a setup flow.

## When Not to Use

* Use a [Step](step.md) to title a collapsible section.

## Usage

```js
import { createStepper } from './configurationpage?name=myplugin_jpkribs_shared.js';

var steps = createStepper({
    steps: [{ id: 'connect', label: 'Connect' }, { id: 'choose', label: 'Choose' }],
    clickable: true,
    onSelect: function (id) { steps.setValue(id); }
});
```

Classes: `jpk-stepper`, `jpk-stepper-step`, `jpk-stepper-number`, `jpk-stepper-control`. The handle is `{ element, getValue, getStep, setValue, setItems, next, previous, destroy }`.

Parts: `jpk-stepper-description`, `jpk-stepper-label`, `jpk-stepper-list`, `jpk-stepper-text`.

## States and Modifiers

* A step is `completed`, `current`, or `upcoming`. The current step has `aria-current="step"`, and each step carries hidden status text.
* `clickable: true` makes completed and current steps buttons.
* `next` and `previous` move by one and return the new id. `setValue` takes an id or an index, and `getStep(id)` returns `{ id, index, label, description }` or `null`.
* At 600px and below the steps stack.

## Used By

No plugin uses it today. Remote Access walks a setup flow with `data-step` in `remoteaccess_configuration.js`.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/stepper.html" title="Stepper example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "stepper.html"
```
