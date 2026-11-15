# Step

A collapsible title made of a round number and a label, for a form split into ordered steps. It is a [Collapsible Section](collapsible-section.md) with a different title.

## When to Use

* Use it when a long form reads best as numbered stages.

## When Not to Use

* Use a [Stepper](stepper.md) to show progress through a flow.

## Usage

```html
<button type="button" class="jpk-collapsible-header collapsed" aria-expanded="false" data-target="serverStepConnection">
    <span class="jpk-collapsible-title jpk-step-title"><span class="jpk-step-number">1</span> Connection</span>
    <span class="jpk-collapsible-icon">&#9660;</span>
</button>
```

Classes: `jpk-step-title`, `jpk-step-number`. It uses the same `initCollapsibles` as the collapsible section.

## States and Modifiers

* `jpk-step-title` resets the capitalization that `jpk-collapsible-title` applies.

## Used By

Remote Access and Server Sync use it. Server Sync uses five of these on its Servers editor.

## Example

<iframe class="jpk-preview" src="../../../assets/previews/step.html" title="Step example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "step.html"
```
