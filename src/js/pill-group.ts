import { bindPressedGroup } from './lib/pressed-group.js';

/** What createPillGroup takes. onChange hears the chosen pill's value after each change. */
export interface PillGroupOptions {
    onChange?(value: string | null): void;
}

/** What createPillGroup returns. get reads the chosen value and set chooses the matching pill, or none. */
export interface PillGroupHandle {
    get(): string | null;
    set(value: string | null): void;
    destroy(): void;
}

/**
 * Wires a base-pill-group of buttons as a single choice, keeping aria-pressed and the selected class on the chosen pill. It reports each change to onChange.
 *
 * @param groupEl element with the base-pill-group class, holding base-pill buttons whose value is their data-value or their text
 * @param options { onChange: function(value) [optional] }
 * @returns { get, set, destroy }.
 */
export function createPillGroup(groupEl: HTMLElement, options?: PillGroupOptions): PillGroupHandle {
    options = options || {};
    if (!groupEl) throw new Error('createPillGroup needs a group element');
    var group = bindPressedGroup(groupEl, {
        selector: '.base-pill',
        onChange: function (values: Array<string | null>) { if (options!.onChange) options!.onChange(values[0]); }
    });

    return {
        get: function (): string | null { var values = group.getValues(); return values.length ? values[0] : null; },
        set: function (value: string | null): void { group.setValues([value]); },
        destroy: group.destroy
    };
}
