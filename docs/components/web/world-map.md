# World Map

A world map that shades each country by its counts, such as people by country, or failed and blocked sign-ins by country. A toggle button per layer sits above the map and is clearly on or off. A country can be selected, so a table beside it can follow.

## When to Use

* Use it for any count by country, with one layer per kind of count, up to six.
* Pair it with a table of the same rows. A country picked on the map filters the table, and a row picked in the table highlights its country.

## When Not to Use

* Never use it for exact numbers alone. Put them in a table beside it.

## Usage

```js
import { createWorldMap, createDataTable, linkWorldMap } from './configurationpage?name=myplugin_jpkribs_shared.js';

var map = createWorldMap({
    layers: [
        { key: 'people', label: 'People', color: 'green' },
        { key: 'failed', label: 'Failed', color: 'orange' },
        { key: 'blocked', label: 'Blocked', color: 'red' }
    ],
    counts: { US: { people: 42, failed: 6 }, DE: { blocked: 2 } },
});
var table = createDataTable({ columns: columns, rows: rows, rowKey: 'country', selectable: true,
    filters: [{ name: 'country', label: 'Countries', options: countryOptions }] });
// a country on the map filters the table, and a row in the table highlights its country
linkWorldMap(map, table, 'country');
```

Classes: `base-world-map`, `base-world-layers`, `base-world-layer`, `base-world-layer-dot`, `base-world-frame`, and `base-world-country` with the `counted` and `selected` modifiers. The handle is `{ element, setCounts, getActive, setActive, select, getSelected, onSelect, totals, countryName, destroy }`.

## States and Modifiers

* `counts` is `{ CODE: { layerKey: count } }` by ISO 3166 alpha-2 code. `setCounts` replaces it.
* `layers` holds up to six layers, and any past the sixth is dropped. Each layer can pick its own `color`, a status color name or a hex code. A layer with no `color` takes the default for its place: the paint primaries blue, yellow, and red, then the secondaries green, orange, and purple.
* Every layer starts on unless `active` names the ones that do. A layer button turns its layer on or off. On is filled with the layer's color and shows a check. Off is an outline with a colored dot. `onLayersChange` reports the layers that are on. `getActive` and `setActive` read and set them.
* A country's color mixes the colors of the layers that are on and have a count there, as paint does, by each layer's share of its count. A country with red and yellow counts is orange. Its strength follows its total over the layers that are on, on a log scale so one busy country does not wash out the rest.
* A click, Enter, or Space on a counted country selects it, and again clears it. Escape clears it. `selected` sets the country that starts selected. `onSelect` reports the code, or null. `select(code)` highlights a country picked elsewhere without calling `onSelect`.
* Each counted country is a button with its name and total, such as "Germany, 6", and with two or more layers each layer's count, such as "Germany, 6 (People 2, Failed 4)". The same text is its tooltip. A country with no count is not focusable.
* `linkWorldMap(map, table, field)` joins it to a [Data Table](data-table.md) so the two share one selection. A country picked on the map selects its rows and leaves every other row in view, and a row picked in the table highlights its country. Clearing either one clears both. It returns a function that unlinks them. The field defaults to `'country'`. Pass `{ field, rowKey }` when the table names its rows by another field, and add `filter: true` to also narrow the table to the picked country while it is selected. `onSelect(listener)` on the handle adds a listener beside the option and returns a function that removes it.
* `totals()` gives each country's count over the layers that are on, for a table's count column. `countryName(code)` gives the map's name for a code.
* With no counts every country is the plain wash.
* With one layer the toggle row is not drawn.

## Gotchas

* Countries too small for the map, such as Monaco, have no shape. Their counts still show in `totals()`. `COUNTRY_CODES` lists every code for a country picker. `WORLD` holds each drawn country's name and path, and `WORLD_VIEWBOX` is the box the paths are drawn in.
* The shapes add about 54 KB to the bundle.

## Reference

Generated from the code by `scripts/build-docs.mjs`. Edit the code, not this section.

<!-- reference:start -->

### `createWorldMap`

<code>function createWorldMap(options: WorldMapOptions): WorldMapHandle</code>

A world map that shades each country by its counts, with a toggle button per layer in its header that is clearly on or off. It shows up to six layers. A layer takes the color it names, and one that names none takes the next default: the paint primaries blue, yellow, and red, then the secondaries green, orange, and purple. Only the layers that are on count. A country's color mixes the colors of its layers as paint does, by each layer's share of its count, so a country with red and yellow counts is orange, and its strength follows its total. A click or Enter on a country selects it, and again clears it, and onSelect reports it, so a table can filter by country. select(code) highlights a country picked elsewhere, such as a table row.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `layers` (required) | <code>WorldMapLayer[]</code> | up to six { key, label, color } where color is a status color name or a hex code (default blue, yellow, red, green, orange, purple in order) [required] |
| `counts` | <code>WorldMapCounts</code> | { CODE: { layerKey: count } } by ISO 3166 alpha-2 code [optional] |
| `active` | <code>string[]</code> | the layer keys that start on (default all) |
| `selected` | <code>string &#124; null</code> | the country code that starts selected [optional] |
| `label` | <code>string</code> | aria-label of the map (default 'World map') |
| `onSelect` | <code>(code: string &#124; null): void</code> | function(code) with the selected code, or null when the selection clears [optional] |
| `onLayersChange` | <code>(active: string[]): void</code> | function(activeKeys) after a layer button turns on or off [optional] |

| Handle member | Type |
| :--- | :--- |
| `setCounts` | <code>(counts: WorldMapCounts): void</code> |
| `getActive` | <code>(): string[]</code> |
| `setActive` | <code>(keys: string[]): void</code> |
| `select` | <code>(code: string &#124; null): void</code> |
| `getSelected` | <code>(): string &#124; null</code> |

### `linkWorldMap`

<code>function linkWorldMap(map: WorldMapHandle, table: WorldMapTable, options?: string &#124; WorldMapLinkOptions): () =&gt; void</code>

Joins a world map to a table both ways, so a selection on either one is the selection on both. A country picked on the map selects its rows and keeps every other row in view, and clearing it clears both. A row picked in the table highlights its country on the map, and clearing the row clears the map. With filter true, a country picked on the map also narrows the table to that country, and clearing either side lifts the filter.

| Option | Type | What it does |
| :--- | :--- | :--- |
| `setCounts` (required) | <code>(counts: WorldMapCounts): void</code> |  |
| `getActive` (required) | <code>(): string[]</code> |  |
| `setActive` (required) | <code>(keys: string[]): void</code> |  |
| `select` (required) | <code>(code: string &#124; null): void</code> |  |
| `getSelected` (required) | <code>(): string &#124; null</code> |  |

| Type | What it is |
| :--- | :--- |
| `WorldMapLayer` | One kind of count the map can show, such as People or Failed. color is a status color name or a hex code. |
| `WorldMapCounts` | Counts by country code, and within each country by layer key, such as { US: { people: 3, failed: 1 } }. |
| `WorldMapTable` | A table the map can follow: it reports a selected row, selects rows from code, and can filter by a field, as createDataTable does. |
| `WorldMapLinkOptions` | How linkWorldMap joins the two. field holds the country code, rowKey names a row, as the table's rowKey does, and filter true also narrows the table to the picked country. |

| Class | What it looks like |
| :--- | :--- |
| `base-world-map` | A world map that shades countries by their counts, with a layer toggle per kind of count above it |
| `base-world-layers` | The layer toggles: on is filled with the layer's color and shows a check, off is an outline with an empty dot |
| `base-world-frame` | The map itself, which scales to its width, with uncounted countries in a faint wash |

<!-- reference:end -->

## Used By

No plugin uses it today.

## Example

<iframe class="base-preview" src="../../../assets/previews/world-map.html" title="World Map example" loading="lazy"></iframe>

## Example Code

```html
--8<-- "world-map.html"
```
