import { claimEscape } from './dom-util.js';

var comboCount = 0;

// Gives a search input and its dropdown the combobox and listbox roles, and keeps aria-expanded and aria-activedescendant in step with what the user sees.
// Internal to createSearchableComboBox and createChipSelect.
export function bindComboAria(input, dropdown) {
    var id = 'jpk-combo-list-' + (++comboCount);
    dropdown.id = id;
    dropdown.setAttribute('role', 'listbox');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-controls', id);
    input.setAttribute('aria-expanded', 'false');

    return {
        // Marks an option element, which later activate calls refer to by its index.
        option: function (el, index) {
            el.id = id + '-option-' + index;
            el.setAttribute('role', 'option');
            el.setAttribute('aria-selected', 'false');
        },
        // Shows or hides the dropdown and drops the active option with it.
        setOpen: function (open) {
            dropdown.classList.toggle('hidden', !open);
            input.setAttribute('aria-expanded', open ? 'true' : 'false');
            claimEscape(input, open);
            if (!open) input.removeAttribute('aria-activedescendant');
        },
        // Marks the option at index as the active one, or none for a negative index.
        activate: function (index) {
            var options = dropdown.querySelectorAll('.jpk-combo-option');
            options.forEach(function (o, i) {
                o.classList.toggle('active', i === index);
                o.setAttribute('aria-selected', i === index ? 'true' : 'false');
            });
            if (index >= 0 && options[index]) input.setAttribute('aria-activedescendant', options[index].id);
            else input.removeAttribute('aria-activedescendant');
        }
    };
}
