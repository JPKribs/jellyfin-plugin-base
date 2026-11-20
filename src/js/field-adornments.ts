import { make, icon, iconButton, listen, runAll } from './lib/dom.js';
import { bindRuledFields } from './lib/validate.js';
import type { ValidationHandle } from './lib/validate.js';
import { baseText } from './lib/base-text.js';

/** What adornField and bindFieldAdornments return. destroy unwraps every field it adorned. */
export interface FieldAdornmentHandle {
    destroy(): void;
}

/** The trailing icon each picker field shows, which opens the browser's own picker. */
var PICKER_ICONS: Record<string, string> = {
    date: 'calendar_today',
    'datetime-local': 'calendar_today',
    month: 'calendar_today',
    week: 'calendar_today',
    time: 'schedule',
    search: 'search'
};

/** The input types adornField handles. */
var SELECTOR = 'input[data-base-reveal], input[type="search"], input[data-base-search], input[type="number"], input[type="date"], input[type="datetime-local"], input[type="month"], input[type="week"], input[type="time"]';

// Fires the events typing would, so a page listening for input or change sees a step.
function notify(input: HTMLInputElement): void {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Wraps one field in a box with controls at its trailing end. A number gets up and down buttons in place of the
 * browser's spinner, a date or time gets its icon, which opens the browser's picker, and a search box, type search or
 * marked data-base-search, gets a search icon. A secret marked data-base-reveal gets an eye that shows and hides it, with
 * data-base-reveal-label and data-base-hide-label for its titles (default 'Show' and 'Hide'). A number marked data-base-unit,
 * such as data-base-unit="%", shows that unit dimmed inside the box before its arrows. Any other field is left as it is.
 *
 * @param input the number, date, time, search, or revealable secret input
 * @returns { destroy }, which puts the input back where it was
 */
export function adornField(input: HTMLInputElement): FieldAdornmentHandle {
    var type = (input.getAttribute('type') || '').toLowerCase();
    // A text field marked data-base-search is a search box too, such as a typeahead.
    if (input.hasAttribute('data-base-search')) type = 'search';
    // A secret shows its eye only when the page opts in, since showing a secret is not always wanted.
    var isReveal = input.hasAttribute('data-base-reveal');
    var parent = input.parentNode;
    var isNumber = type === 'number';
    var owner = parent as HTMLElement | null;
    // A search field draws its own icon and clear button, so it is left alone.
    if (!parent || (!isNumber && !isReveal && !PICKER_ICONS[type]) || (owner && owner.classList && (owner.classList.contains('base-adorned') || owner.classList.contains('base-search')))) {
        return { destroy: function () { /* nothing was wrapped */ } };
    }
    var cleanups: Array<() => void> = [];
    var kind = isReveal ? 'base-adorned-reveal' : isNumber ? 'base-adorned-number' : type === 'search' ? 'base-adorned-search' : 'base-adorned-picker';
    var box = make('span', 'base-adorned ' + kind);
    parent.insertBefore(box, input);
    box.appendChild(input);

    if (isReveal) {
        var showLabel = input.getAttribute('data-base-reveal-label') || baseText('Base.Show');
        var hideLabel = input.getAttribute('data-base-hide-label') || baseText('Hide');
        var eye = iconButton('base-adorned-eye', 'visibility', showLabel);
        eye.setAttribute('aria-pressed', 'false');
        box.appendChild(eye);
        var setShown = function (shown: boolean): void {
            input.type = shown ? 'text' : 'password';
            var title = shown ? hideLabel : showLabel;
            eye.title = title;
            eye.setAttribute('aria-label', title);
            eye.setAttribute('aria-pressed', shown ? 'true' : 'false');
            eye.children[0].textContent = shown ? 'visibility_off' : 'visibility';
        };
        cleanups.push(listen(eye, 'click', function () { setShown(input.type === 'password'); }));
        // A secret goes back to dots when the box is taken apart.
        cleanups.push(function () { input.type = 'password'; });
    } else if (isNumber) {
        var steps = make('span', 'base-adorned-steps');
        var up = iconButton('base-adorned-step', 'keyboard_arrow_up', baseText('Base.Increase'));
        var down = iconButton('base-adorned-step', 'keyboard_arrow_down', baseText('Base.Decrease'));
        up.tabIndex = -1;
        down.tabIndex = -1;
        steps.appendChild(up);
        steps.appendChild(down);
        box.appendChild(steps);
        var unit = input.getAttribute('data-base-unit');
        // A unit is part of the box and is never typed, like the # of a color.
        if (unit) {
            box.classList.add('base-adorned-with-unit');
            // A unit longer than one character, such as Mbps, takes room for its own width so it never covers the digits.
            if (unit.length > 1) box.style.setProperty('--base-adorned-unit-room', 'calc(' + unit.length + 'ch + 0.5em)');
            box.appendChild(make('span', 'base-adorned-unit', { 'aria-hidden': 'true' }, unit));
        }
        cleanups.push(listen(up, 'click', function () {
            if (input.disabled || input.readOnly) return;
            try { input.stepUp(); } catch (e) { input.value = String((parseFloat(input.value) || 0) + (parseFloat(input.step) || 1)); }
            notify(input);
        }));
        cleanups.push(listen(down, 'click', function () {
            if (input.disabled || input.readOnly) return;
            try { input.stepDown(); } catch (e) { input.value = String((parseFloat(input.value) || 0) - (parseFloat(input.step) || 1)); }
            notify(input);
        }));
    } else {
        // A picker's own button sits invisible over this icon, so a click on it opens the picker. A search icon only marks the box.
        var glyph = icon(PICKER_ICONS[type]);
        glyph.classList.add('base-adorned-icon');
        box.appendChild(glyph);
    }

    return {
        destroy: function () {
            runAll(cleanups);
            if (box.parentNode) {
                box.parentNode.insertBefore(input, box);
                box.parentNode.removeChild(box);
            }
        }
    };
}

/**
 * Adorns every number, date, time, and search field under a root, and the ones added later, so each shows Base's own up and
 * down buttons or its picker icon at the trailing end. It also binds the validation core on every field that carries a rule,
 * such as required, min, max, pattern, or a number, url, email, time, or date type. createConfigPage runs it on every page.
 *
 * @param root the page or element to search within
 * @returns { destroy }
 */
export function bindFieldAdornments(root: ParentNode): FieldAdornmentHandle {
    var bound: FieldAdornmentHandle[] = [];
    var checked: ValidationHandle[] = [];

    function scan(): void {
        root.querySelectorAll<HTMLInputElement>(SELECTOR).forEach(function (input) {
            var parent = input.parentNode as HTMLElement | null;
            if (parent && parent.classList && parent.classList.contains('base-adorned')) return;
            bound.push(adornField(input));
        });
        checked = checked.concat(bindRuledFields(root));
    }

    var observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(scan);
        observer.observe(root as Node, { childList: true, subtree: true });
    }
    scan();

    return {
        destroy: function () {
            if (observer) observer.disconnect();
            bound.splice(0).forEach(function (b) { b.destroy(); });
            checked.splice(0).forEach(function (b) { b.destroy(); });
        }
    };
}
