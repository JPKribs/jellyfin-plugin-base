# Stepper

A row of numbered steps for a flow of several stages. Steps before the current one are completed and later ones are upcoming.

## When to Use

* Use it to show where the reader is in a setup flow.

## When Not to Use

* Use a numbered [Collapsible Section](collapsible-section.md) for a form split into ordered steps.

## Usage

```js
import { createStepper } from './configurationpage?name=myplugin_jpkribs_shared.js';

var steps = createStepper({
    steps: [{ id: 'connect', label: 'Connect' }, { id: 'choose', label: 'Choose' }],
    clickable: true,
    onSelect: function (id) { steps.setValue(id); }
});
```

Classes: `base-stepper`, `base-stepper-step`, `base-stepper-number`, `base-stepper-control`, `base-stepper-segment`. The handle is `{ element, getValue, getStep, setValue, setItems, next, previous, destroy }`.

Parts: `base-stepper-description`, `base-stepper-label`, `base-stepper-list`, `base-stepper-text`.

## States and Modifiers

* A step is `completed`, `current`, or `upcoming` by its place. The current step has `aria-current="step"`, and each step carries hidden status text.
* A step's own `state` draws it as `completed`, `current`, `upcoming`, `attention`, or `optional` wherever it sits, for a flow whose steps finish in any order. `attention` fills the number orange, and `optional` dashes its ring. `attentionText` and `optionalText` replace their hidden text.
* `clickable: true` makes completed and current steps buttons, and `clickable: 'all'` makes every step one.
* `layout: 'segments'` draws a bar of one segment per step in its state's color, with each label as the segment's tooltip and hidden text. The [Setup Checklist](setup-checklist.md) uses it as its summary.
* `next` and `previous` move by one and return the new id. `setValue` takes an id or an index, and `getStep(id)` returns `{ id, index, label, description }` or `null`.
* At 600px and below the steps stack.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createStepper`

<code>function createStepper(options?: StepperOptions): StepperHandle</code>

A row of numbered steps for a flow of several stages. Steps before the current one are completed, the current one has aria-current step, and later ones are upcoming. A step can be a button that reports itself. A step's own state draws it as completed, current, upcoming, attention, or optional wherever it sits, and the segments layout draws each step as one segment of a bar.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `steps` | <code>StepperStep[]</code> | array of { id, label, description, state } [optional] |
| `value` | <code>string &#124; number</code> | the current step, where a string is an id and a number is an index, so a numeric id is given as a string (default the first step) |
| `clickable` | <code>boolean &#124; 'all'</code> | true makes completed and current steps buttons, and 'all' makes every step one (default false) |
| `layout` | <code>'steps' &#124; 'segments'</code> | 'steps' draws numbered steps, and 'segments' draws a bar of one segment per step, its labels kept as tooltips and hidden text (default 'steps') |
| `navLabel` | <code>string</code> | aria-label of the list (default 'Progress') |
| `completedText` | <code>string</code> | hidden text for a completed step (default 'Completed') |
| `currentText` | <code>string</code> | hidden text for the current step (default 'Current') |
| `upcomingText` | <code>string</code> | hidden text for a later step (default 'Not started') |
| `attentionText` | <code>string</code> | hidden text for a step that needs attention (default 'Needs attention') |
| `optionalText` | <code>string</code> | hidden text for an optional step (default 'Optional') |
| `onSelect` | <code>(id: string &#124; number, index: number): void</code> | function(id, index) called when a step button is pressed [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): string &#124; number &#124; null</code> |
| `getStep` | <code>(id: unknown): StepperStepInfo &#124; null</code> |
| `setValue` | <code>(value: string &#124; number): void</code> |
| `setItems` | <code>(next: StepperStep[], value?: string &#124; number): void</code> |
| `next` | <code>(): string &#124; number &#124; null</code> |
| `previous` | <code>(): string &#124; number &#124; null</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `StepperStepState` | How a step is drawn. A step's own state replaces the one its place before or after the current step gives it. |
| `StepperStep` | One step of a stepper. state sets its look on its own, whatever the current step is. |
| `StepperStepInfo` | What getStep returns for a step, with its index. |

| Class | What it looks like |
| :--- | :--- |
| `base-stepper-list` | Row of steps for a flow of stages, which becomes a column on a narrow screen |
| `base-stepper-control` | One step, as a div or as a button when it can be chosen |
| `base-stepper-number` | Round number, filled with the accent when current and green with a dark check when completed |
| `base-stepper.segments` | A stepper drawn as a bar of one segment per step, in each step's color, for a summary of progress. Its labels are tooltips and hidden text |

<!-- reference:end -->

## Used By

No plugin uses it today. Remote Access walks a setup flow with `data-step` in `remoteaccess_configuration.js`.

## Example

<iframe class="base-preview" src="../../../assets/previews/stepper.html" title="Stepper example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "stepper.html"
```
