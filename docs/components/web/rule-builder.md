# Rule Builder

Rules of field, operator, and value under a choice of matching all of them or any one. It is a [Repeater](repeater.md) whose value control follows the chosen field: a text box, a select, a number box, or chips. A warning row under the rules says when they need attention.

## Decision

| When | Use |
| :--- | :--- |
| A filter the reader writes, such as which items a sync takes or which events send a notification | Rule Builder |
| Filters the reader picks from fixed choices | [Filter Panel](filter-panel.md) |
| Rows of fields that do not depend on each other | [Repeater](repeater.md) |

## Usage

```js
import { createRuleBuilder } from './configurationpage?name=myplugin_jpkribs_shared.js';

var rules = createRuleBuilder({
    fields: [
        { key: 'title', label: 'Title' },
        { key: 'year', label: 'Year', type: 'number' },
        { key: 'type', label: 'Type', type: 'select', options: ['Movie', 'Series'] },
        { key: 'genres', label: 'Genres', type: 'chips' }
    ],
    value: config.Rules,
    warn: function (value) { return value.rules.length ? '' : 'Every item matches.'; },
    onChange: function (value) { config.Rules = value; }
});
view.querySelector('#rulesHost').appendChild(rules.element);
```

Classes: `base-rule-builder`, `base-rule-match`, `base-rule-rows`, `base-rule-value`, `base-rule-warning`. The handle is `{ element, getValue, setValue, isValid, setWarning, destroy }`.

## States and Modifiers

* The value is `{ match, rules }`, where `match` is `'all'` or `'any'` and each rule is `{ field, operator, value }`. A chips value is a list of text.
* A field is `{ key, label, type, options, operators, placeholder }`. `type` is `text` (default), `select`, `number`, or `chips`. `operators` replaces the type's own list, given in `RULE_OPERATORS`.
* Changing a rule's field swaps its operators and its value control, and keeps the value while the type stays the same.
* The match choice is a [Pill Group](pill-group.md), "Match all" and "Match any" by `allText` and `anyText`.
* `warn(value)` returns a warning sentence after each change, shown under the rules as a warning [Field Message](field-message.md). `setWarning(text)` shows one from code, and an empty value clears it.
* A rule's value is required. `isValid()` checks every rule and moves focus to the first invalid one.
* The rows, their limits, and their labels come from the Repeater. `addText` is "Add rule", `rowName` is "Rule", and the column labels are "Field", "Operator", and "Value".

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `RULE_OPERATORS`

<code>var RULE_OPERATORS: Record&lt;string, Array&lt;{ value: string; label: string; }&gt;&gt;</code>

### `createRuleBuilder`

<code>function createRuleBuilder(options: RuleBuilderOptions): RuleBuilderHandle</code>

Rows of field, operator, and value, with a choice of matching all rules or any one. It is a Repeater whose value control follows the chosen field: a text box, a select, a number box, or chips. A warning row under the rules says when they need attention.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `fields` (required) | <code>RuleBuilderField[]</code> | array of { key, label, type ('text', 'select', 'number', or 'chips'), options, operators, placeholder } [required] |
| `value` | <code>RuleBuilderValue &#124; null</code> | { match ('all' or 'any'), rules: [{ field, operator, value }] } [optional] |
| `allText` | <code>string</code> |  |
| `anyText` | <code>string</code> |  |
| `matchLabel` | <code>string</code> | aria-label of the match choice (default 'Match') |
| `fieldLabel` | <code>string</code> |  |
| `operatorLabel` | <code>string</code> |  |
| `valueLabel` | <code>string</code> |  |
| `addText` | <code>string</code> | text of the add button (default 'Add rule') |
| `removeText` | <code>string</code> | aria-label of a remove button, where {value} is the rule's name (default 'Remove {value}') |
| `rowName` | <code>string</code> | prefix of a rule's name (default 'Rule') |
| `maxRows` | <code>number</code> |  |
| `minRows` | <code>number</code> |  |
| `limitText` | <code>string</code> |  |
| `emptyText` | <code>string</code> |  |
| `size` | <code>'small' &#124; 'medium' &#124; 'large'</code> | 'small', 'medium', or 'large' for its fields (default 'medium') |
| `warn` | <code>(value: RuleBuilderValue): string &#124; null &#124; undefined</code> | function(value) returning a warning sentence, or an empty value for none [optional] |
| `onChange` | <code>(value: RuleBuilderValue): void</code> | function(value) after each change [optional] |

| Handle member | Type |
| :--- | :--- |
| `getValue` | <code>(): RuleBuilderValue</code> |
| `setValue` | <code>(next: RuleBuilderValue &#124; null): void</code> |
| `isValid` | <code>(): boolean</code> |
| `setWarning` | <code>(text: string &#124; null &#124; undefined): void</code> |
| `destroy` | <code>(): void</code> |

| Type | What it is |
| :--- | :--- |
| `RuleBuilderField` | A field a rule can test. type picks the value control: a text box, a select of options, a number box, or chips. operators replaces the type's own list. |
| `RuleBuilderRule` | One rule: the field it tests, its operator, and the value, which is a list of text for a chips field. |
| `RuleBuilderValue` | The rules and whether an item must match all of them or any one. |

| Class | What it looks like |
| :--- | :--- |
| `base-rule-builder` | Rules of field, operator, and value under a choice of matching all or any, a Repeater with a warning row under the rules |
| `base-rule-value` | The value control of one rule, which follows the type of the rule's field |
| `base-rule-warning` | The warning under the rules, a Field Message in the warning state |

<!-- reference:end -->

## Example

<iframe class="base-preview" src="../../../assets/previews/rule-builder.html" title="Rule Builder example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "rule-builder.html"
```
