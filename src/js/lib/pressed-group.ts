// pressed-group.ts
// The group of on and off buttons that the pill group and the schedule picker's day toggles share. None of them is exported from the bundle.

import { listen } from './dom.js';

/** What bindPressedGroup takes. selector finds the buttons, multiple lets any number be on, clearable lets a second click turn the one button off, and readValue reads a button's value. */
export interface PressedGroupOptions {
    selector: string;
    multiple?: boolean;
    clearable?: boolean;
    readValue?(button: HTMLElement): string | null;
    onChange?(values: Array<string | null>, button: HTMLElement): void;
}

/** What bindPressedGroup returns. getValues reads the values of the buttons that are on, in document order, and setValues turns on exactly the matching ones without onChange. */
export interface PressedGroupHandle {
    buttons(): HTMLElement[];
    getValues(): Array<string | null>;
    setValues(values: Array<string | null>): void;
    destroy(): void;
}

// The value of a button, its data-value, else its text.
function defaultValue(button: HTMLElement): string | null {
    var value = button.getAttribute('data-value');
    return value === null ? button.textContent : value;
}

/**
 * Wires the buttons in el that match selector as on and off buttons. A button is on when aria-pressed is true or it has the selected class, and both are kept in step.
 * With multiple a click turns a button on or off, and without it a click turns the clicked button on and the rest off, and a click on the button already on does nothing, or turns it off with clearable.
 *
 * @param el element that holds the buttons
 * @param opts { selector, multiple (default false), clearable (default false), readValue(button) (default data-value, else the text), onChange(values, button) [optional] }
 * @returns { buttons, getValues, setValues, destroy }.
 */
export function bindPressedGroup(el: HTMLElement, opts: PressedGroupOptions): PressedGroupHandle {
    var readValue = opts.readValue || defaultValue;

    function buttons(): HTMLElement[] { return Array.prototype.slice.call(el.querySelectorAll(opts.selector)); }

    function isOn(button: HTMLElement): boolean {
        return button.getAttribute('aria-pressed') === 'true' || button.classList.contains('selected');
    }

    function mark(button: HTMLElement, on: boolean): void {
        button.classList.toggle('selected', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function getValues(): Array<string | null> {
        return buttons().filter(isOn).map(readValue);
    }

    // Turns on the buttons that pass keep, and only the first of them without multiple.
    function reflect(keep: (button: HTMLElement) => boolean): void {
        var found = false;
        buttons().forEach(function (button) {
            var on = keep(button) && (opts.multiple || !found);
            if (on) found = true;
            mark(button, on);
        });
    }

    var stop = listen(el, 'click', function (e: MouseEvent) {
        var target = e.target as Element | null;
        var button = target && target.closest ? target.closest<HTMLElement>(opts.selector) : null;
        if (!button || !el.contains(button) || (button as HTMLButtonElement).disabled) return;
        if (opts.multiple) mark(button, !isOn(button));
        else if (isOn(button) && opts.clearable) mark(button, false);
        else if (isOn(button)) return;
        else reflect(function (b) { return b === button; });
        if (opts.onChange) opts.onChange(getValues(), button);
    });

    reflect(isOn);

    return {
        buttons: buttons,
        getValues: getValues,
        setValues: function (values: Array<string | null>) {
            reflect(function (b) { return values.indexOf(readValue(b)) !== -1; });
        },
        destroy: stop
    };
}
