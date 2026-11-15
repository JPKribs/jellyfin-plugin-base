/** What createChoiceGroup takes. onChange hears the checked value after each change. */
export interface ChoiceGroupOptions {
    onChange?(value: string | null): void;
}

/** What createChoiceGroup returns. get reads the checked value and set checks the matching input. */
export interface ChoiceGroupHandle {
    get(): string | null;
    set(value: string): void;
    destroy(): void;
}

/**
 * Wires a group of jpk-choice radio cards, keeping the selected class in step with the checked input for browsers without :has(). It reports each change to onChange.
 *
 * @param groupEl element with the jpk-choice-group class
 * @param options { onChange: function(value) [optional] }
 * @returns { get, set, destroy }.
 */
export function createChoiceGroup(groupEl: HTMLElement, options?: ChoiceGroupOptions): ChoiceGroupHandle {
    options = options || {};
    if (!groupEl) throw new Error('createChoiceGroup needs a group element');

    function reflect(): void {
        groupEl.querySelectorAll('.jpk-choice').forEach(function (choice) {
            var input = choice.querySelector<HTMLInputElement>('input');
            choice.classList.toggle('selected', !!(input && input.checked));
        });
    }

    function onChange(): void {
        reflect();
        if (options!.onChange) options!.onChange(get());
    }

    function get(): string | null {
        var checked = groupEl.querySelector<HTMLInputElement>('input:checked');
        return checked ? checked.value : null;
    }

    groupEl.addEventListener('change', onChange);
    reflect();

    return {
        get: get,
        set: function (value: string): void {
            groupEl.querySelectorAll<HTMLInputElement>('input').forEach(function (input) { input.checked = input.value === value; });
            reflect();
        },
        destroy: function (): void { groupEl.removeEventListener('change', onChange); }
    };
}
