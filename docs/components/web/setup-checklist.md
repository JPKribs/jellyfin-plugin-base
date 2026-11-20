# Setup Checklist

A setup page as a checklist of numbered steps. Each step is a [Collapsible Section](collapsible-section.md) whose header badge shows its state, and a [Stepper](stepper.md) bar above them sums up the progress, such as "3 of 6 done".

## Decision

| When | Use |
| :--- | :--- |
| A setup that has several steps the reader finishes in any order and comes back to, such as opening a server to the internet | Setup Checklist |
| A flow that moves forward one stage at a time | [Stepper](stepper.md) |
| A form in ordered parts with no state | Numbered [Collapsible Sections](collapsible-section.md) |

## Usage

```js
import { createSetupChecklist } from './configurationpage?name=myplugin_jpkribs_shared.js';

var checklist = createSetupChecklist({
    steps: [
        { key: 'port', title: 'Choose a Port', state: 'done', content: '<p>Port 8920 is open.</p>' },
        { key: 'domain', title: 'Point a Domain', state: 'attention', content: domainFields, action: { text: 'Check Again', onClick: checkDomain } },
        { key: 'relay', title: 'Set Up a Relay', state: 'optional', content: relayFields }
    ]
});
view.querySelector('#setupHost').appendChild(checklist.element);
checklist.setState('domain', 'done');
```

The handle is `{ element, getValue, setValue, getState, setState, setItems, open, destroy }`.

## States and Modifiers

| State | Badge | Segment |
| :--- | :--- | :--- |
| `done` | Done, green | Green |
| `attention` | Needs attention, orange | Orange |
| `todo` | To do, gray | Faint, or the accent for the next step to do |
| `optional` | Optional, blue | Faint |

* A step is `{ key, title, state, content, action }`. `content` is HTML or a node, and `action` is `{ text, className, onClick(key) }`, a button under the content, primary unless `className` says otherwise.
* The first step that is not done opens on its own. With `autoAdvance` (the default), a step that turns done while open closes and the next one that is not done opens.
* The summary counts the done steps through `summaryText`, `{done} of {total} done` by default. Each segment is a button named by its step and state that opens and focuses its step.
* `setState(key, state)` updates the badge, the count, and the segment, and calls `onStateChange(key, state)`. `getValue()` maps each key to its state, and `setValue(map)` sets several.
* `stateLabels` replaces the badge words, such as `{ done: 'Ready' }`.
* The steps are numbered from one in each checklist.

## Gotchas

* A string `content` is HTML, so escape data in it.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createSetupChecklist`

<code>function createSetupChecklist(options?: SetupChecklistOptions): SetupChecklistHandle</code>

A setup page as a checklist of numbered collapsible steps, each showing its state as a badge in its header, with a segmented summary above them, such as 3 of 6 done, whose segments open their step. The first step that is not done opens on its own.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `steps` | <code>SetupStep[]</code> | array of { key, title, state, content, action: { text, className, onClick(key) } } where state is 'done', 'attention', 'todo', or 'optional' (default 'todo') [optional] |
| `stateLabels` | <code>Partial&lt;Record&lt;SetupStepState, string&gt;&gt;</code> | the badge word for each state (default Done, Needs attention, To do, and Optional) [optional] |
| `summaryText` | <code>string</code> | the summary, where {done} and {total} are counts (default '{done} of {total} done') |
| `navLabel` | <code>string</code> | aria-label of the summary bar (default 'Setup progress') |
| `autoAdvance` | <code>boolean</code> | true closes a step that turns done and opens the next one that is not (default true) |
| `onStateChange` | <code>(key: string, state: SetupStepState): void</code> | function(key, state) called after setState changes a step [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): Record&lt;string, SetupStepState&gt;</code> |
| `setValue` | <code>(states: Record&lt;string, SetupStepState&gt;): void</code> |
| `getState` | <code>(key: string): SetupStepState &#124; null</code> |
| `setState` | <code>(key: string, state: SetupStepState): void</code> |
| `setItems` | <code>(steps: SetupStep[]): void</code> |
| `open` | <code>(key: string): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `SetupStepState` | Where a setup step stands. done is finished, attention needs a fix, todo is not started, and optional can be skipped. |
| `SetupStep` | One step of a setup checklist. action is a button under its content. |

| Class | What it looks like |
| :--- | :--- |
| `base-setup-checklist` | A setup checklist, its progress summary above a numbered run of collapsible steps |
| `base-setup-summary` | The progress summary, its count above a bar of one segment per step that opens the step it stands for |
| `base-setup-steps` | The numbered run of steps, counted from one in each checklist |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/setup-checklist.html" title="Setup Checklist example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "setup-checklist.html"
```
