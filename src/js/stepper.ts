import { make, icon, clear } from './lib/dom.js';
import type { ComponentHandle } from './types.js';

/** How a step is drawn. A step's own state replaces the one its place before or after the current step gives it. */
export type StepperStepState = 'completed' | 'current' | 'upcoming' | 'attention' | 'optional';

/** One step of a stepper. state sets its look on its own, whatever the current step is. */
export interface StepperStep {
    id: string | number;
    label?: string;
    description?: string;
    state?: StepperStepState;
}

/** What getStep returns for a step, with its index. */
export interface StepperStepInfo {
    id: string | number;
    index: number;
    label?: string;
    description?: string;
}

/** What createStepper takes. A string value is an id and a number value is an index. */
export interface StepperOptions {
    steps?: StepperStep[];
    value?: string | number;
    clickable?: boolean | 'all';
    layout?: 'steps' | 'segments';
    navLabel?: string;
    completedText?: string;
    currentText?: string;
    upcomingText?: string;
    attentionText?: string;
    optionalText?: string;
    onSelect?(id: string | number, index: number): void;
}

/** What createStepper returns. next and previous move by one and return the new id. */
export interface StepperHandle extends ComponentHandle {
    getValue(): string | number | null;
    getStep(id: unknown): StepperStepInfo | null;
    setValue(value: string | number): void;
    setItems(next: StepperStep[], value?: string | number): void;
    next(): string | number | null;
    previous(): string | number | null;
    destroy(): void;
}

/**
 * A row of numbered steps for a flow of several stages. Steps before the current one are completed, the current one has aria-current step, and later ones are upcoming. A step can be a button that reports itself.
 * A step's own state draws it as completed, current, upcoming, attention, or optional wherever it sits, and the segments layout draws each step as one segment of a bar.
 *
 * @param options {
 *   steps         : array of { id, label, description, state } [optional]
 *   value         : the current step, where a string is an id and a number is an index, so a numeric id is given as a string (default the first step)
 *   clickable     : true makes completed and current steps buttons, and 'all' makes every step one (default false)
 *   layout        : 'steps' draws numbered steps, and 'segments' draws a bar of one segment per step, its labels kept as tooltips and hidden text (default 'steps')
 *   navLabel      : aria-label of the list (default 'Progress')
 *   completedText : hidden text for a completed step (default 'Completed')
 *   currentText   : hidden text for the current step (default 'Current')
 *   upcomingText  : hidden text for a later step (default 'Not started')
 *   attentionText : hidden text for a step that needs attention (default 'Needs attention')
 *   optionalText  : hidden text for an optional step (default 'Optional')
 *   onSelect      : function(id, index) called when a step button is pressed [optional]
 * }
 * @returns { element, getValue, getStep, setValue, setItems, next, previous, destroy }. getValue returns the current id. setValue takes an id string or an index number. getStep(id) returns { id, index, label, description } for any id, a number included, or null. next and previous move by one and return the new id.
 */
export function createStepper(options?: StepperOptions): StepperHandle {
    options = options || {};
    var steps: StepperStep[] = [];
    var current: number = 0;

    var segments: boolean = options.layout === 'segments';
    var root = make('nav', 'base-stepper' + (segments ? ' segments' : ''), { 'aria-label': options.navLabel || 'Progress' });
    var list = make('ol', 'base-stepper-list');
    root.appendChild(list);

    // The hidden text a screen reader hears for a step's state.
    function statusText(state: StepperStepState): string {
        if (state === 'completed') return options!.completedText || 'Completed';
        if (state === 'current') return options!.currentText || 'Current';
        if (state === 'attention') return options!.attentionText || 'Needs attention';
        if (state === 'optional') return options!.optionalText || 'Optional';
        return options!.upcomingText || 'Not started';
    }

    function render(): void {
        clear(list);
        steps.forEach(function (step, index) {
            var state: StepperStepState = step.state || (index < current ? 'completed' : (index === current ? 'current' : 'upcoming'));
            var li = make('li', 'base-stepper-step ' + state);
            var control = options!.clickable && (options!.clickable === 'all' || state !== 'upcoming')
                ? make('button', 'base-stepper-control', { type: 'button' })
                : make('div', 'base-stepper-control');
            if (index === current) control.setAttribute('aria-current', 'step');
            if (segments && step.label) control.title = step.label;
            var badge = make('span', 'base-stepper-number', { 'aria-hidden': 'true' });
            if (segments) badge.className = 'base-stepper-segment';
            else if (state === 'completed') badge.appendChild(icon('check'));
            else badge.textContent = String(index + 1);
            var text = make('span', segments ? 'base-stepper-text base-sr-only' : 'base-stepper-text');
            text.appendChild(make('span', 'base-stepper-label', null, step.label));
            if (step.description) text.appendChild(make('span', 'base-stepper-description', null, step.description));
            text.appendChild(make('span', 'base-sr-only', null, statusText(state)));
            control.appendChild(badge);
            control.appendChild(text);
            if (control.tagName === 'BUTTON') control.addEventListener('click', function () { if (options!.onSelect) options!.onSelect(step.id, index); });
            li.appendChild(control);
            list.appendChild(li);
        });
    }

    // A number is an index, and a string is an id, so a numeric id is given as a string.
    function indexOf(value: unknown): number {
        if (typeof value === 'number') return isFinite(value) && steps.length ? Math.max(0, Math.min(steps.length - 1, Math.floor(value))) : -1;
        if (typeof value !== 'string') return -1;
        for (var i = 0; i < steps.length; i++) if (String(steps[i].id) === value) return i;
        return -1;
    }

    function setValue(value: string | number): void {
        var at = indexOf(value);
        if (at === -1) return;
        current = at;
        render();
    }

    function setItems(next: StepperStep[] | undefined, value?: string | number): void {
        steps = (next || []).slice();
        current = 0;
        if (value !== undefined && indexOf(value) !== -1) current = indexOf(value);
        render();
    }

    setItems(options.steps, options.value);

    return {
        element: root,
        getValue: function () { return steps.length ? steps[current].id : null; },
        getStep: function (id) {
            for (var i = 0; i < steps.length; i++) if (String(steps[i].id) === String(id)) return { id: steps[i].id, index: i, label: steps[i].label, description: steps[i].description };
            return null;
        },
        setValue: setValue,
        setItems: setItems,
        next: function () { setValue(current + 1); return steps.length ? steps[current].id : null; },
        previous: function () { setValue(current - 1); return steps.length ? steps[current].id : null; },
        destroy: function () { clear(list); }
    };
}
