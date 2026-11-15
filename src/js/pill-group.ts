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
 * Wires a jpk-pill-group of buttons as a single choice, keeping aria-pressed and the selected class on the chosen pill. It reports each change to onChange.
 *
 * @param groupEl element with the jpk-pill-group class, holding jpk-pill buttons whose value is their data-value or their text
 * @param options { onChange: function(value) [optional] }
 * @returns { get, set, destroy }.
 */
export function createPillGroup(groupEl: HTMLElement, options?: PillGroupOptions): PillGroupHandle {
    options = options || {};
    if (!groupEl) throw new Error('createPillGroup needs a group element');

    function pills(): HTMLButtonElement[] { return Array.prototype.slice.call(groupEl.querySelectorAll('.jpk-pill')); }

    function valueOf(pill: HTMLElement): string | null {
        var value = pill.getAttribute('data-value');
        return value === null ? pill.textContent : value;
    }

    // Marks the given pill, or none, as the chosen one.
    function reflect(chosen: HTMLElement | null): void {
        pills().forEach(function (pill) {
            var on = pill === chosen;
            pill.classList.toggle('selected', on);
            pill.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function current(): HTMLButtonElement | null {
        return pills().filter(function (pill) { return pill.getAttribute('aria-pressed') === 'true' || pill.classList.contains('selected'); })[0] || null;
    }

    function get(): string | null {
        var chosen = current();
        return chosen ? valueOf(chosen) : null;
    }

    function onClick(e: MouseEvent): void {
        var pill = (e.target as Element).closest && (e.target as Element).closest<HTMLButtonElement>('.jpk-pill');
        if (!pill || !groupEl.contains(pill) || pill.disabled || pill === current()) return;
        reflect(pill);
        if (options!.onChange) options!.onChange(valueOf(pill));
    }

    groupEl.addEventListener('click', onClick);
    reflect(current());

    return {
        get: get,
        set: function (value: string | null): void {
            reflect(pills().filter(function (pill) { return valueOf(pill) === value; })[0] || null);
        },
        destroy: function (): void { groupEl.removeEventListener('click', onClick); }
    };
}
