import { createCollapsibleSection } from './collapsible-section.js';
import type { CollapsibleSectionHandle, CollapsibleBadge } from './collapsible-section.js';
import { createStepper } from './stepper.js';
import type { StepperHandle, StepperStep, StepperStepState } from './stepper.js';
import { make, fillAll, runAll, listen, clear } from './lib/dom.js';
import type { ComponentHandle } from './types.js';

/** Where a setup step stands. done is finished, attention needs a fix, todo is not started, and optional can be skipped. */
export type SetupStepState = 'done' | 'attention' | 'todo' | 'optional';

/** One step of a setup checklist. action is a button under its content. */
export interface SetupStep {
    key: string;
    title: string;
    state?: SetupStepState;
    content?: string | Node;
    action?: { text: string; className?: string; onClick?(key: string): void } | null;
}

/** What createSetupChecklist takes. stateLabels replaces the badge words, and summaryText holds {done} and {total}. */
export interface SetupChecklistOptions {
    steps?: SetupStep[];
    stateLabels?: Partial<Record<SetupStepState, string>>;
    summaryText?: string;
    navLabel?: string;
    autoAdvance?: boolean;
    onStateChange?(key: string, state: SetupStepState): void;
}

/** What createSetupChecklist returns. getValue maps each step key to its state, and open shows one step. */
export interface SetupChecklistHandle extends ComponentHandle {
    getValue(): Record<string, SetupStepState>;
    setValue(states: Record<string, SetupStepState>): void;
    getState(key: string): SetupStepState | null;
    setState(key: string, state: SetupStepState): void;
    setItems(steps: SetupStep[]): void;
    open(key: string): void;
    destroy(): void;
}

var STATES: SetupStepState[] = ['done', 'attention', 'todo', 'optional'];
var LABELS: Record<SetupStepState, string> = { done: 'Done', attention: 'Needs Attention', todo: 'To Do', optional: 'Optional' };
var COLORS: Record<SetupStepState, string> = { done: 'green', attention: 'orange', todo: 'gray', optional: 'blue' };
var SEGMENT: Record<SetupStepState, StepperStepState> = { done: 'completed', attention: 'attention', todo: 'upcoming', optional: 'optional' };

/**
 * Reads a step state, where anything unknown is todo.
 * Internal to the web components.
 *
 * @param state the state to read
 */
export function setupState(state: unknown): SetupStepState {
    return STATES.indexOf(state as SetupStepState) !== -1 ? state as SetupStepState : 'todo';
}

/**
 * Returns the index of the first step that is not done, or -1 when every step is done.
 * Internal to the web components.
 *
 * @param states each step's state, in order
 */
export function firstOpenStep(states: unknown[]): number {
    for (var i = 0; i < states.length; i++) if (setupState(states[i]) !== 'done') return i;
    return -1;
}

/**
 * A setup page as a checklist of numbered collapsible steps, each showing its state as a badge in its header, with a segmented
 * summary above them, such as 3 of 6 done, whose segments open their step. The first step that is not done opens on its own.
 *
 * @param options {
 *   steps         : array of { key, title, state, content, action: { text, className, onClick(key) } } where state is 'done', 'attention', 'todo', or 'optional' (default 'todo') [optional]
 *   stateLabels   : the badge word for each state (default Done, Needs Attention, To Do, and Optional) [optional]
 *   summaryText   : the summary, where {done} and {total} are counts (default '{done} of {total} done')
 *   navLabel      : aria-label of the summary bar (default 'Setup progress')
 *   autoAdvance   : true closes a step that turns done and opens the next one that is not (default true)
 *   onStateChange : function(key, state) called after setState changes a step [optional]
 * }
 * @returns { element, getValue, setValue, getState, setState, setItems, open, destroy }. getValue maps each key to its state, and setValue takes the same map.
 */
export function createSetupChecklist(options?: SetupChecklistOptions): SetupChecklistHandle {
    options = options || {};
    var labels: Record<SetupStepState, string> = { done: LABELS.done, attention: LABELS.attention, todo: LABELS.todo, optional: LABELS.optional };
    var custom = options.stateLabels || {};
    STATES.forEach(function (s: SetupStepState): void { if (custom[s]) labels[s] = custom[s]!; });
    var steps: SetupStep[] = [];
    var sections: CollapsibleSectionHandle[] = [];
    var cleanups: Array<() => void> = [];

    var root = make('div', 'base-setup-checklist');
    var summary = make('div', 'base-setup-summary');
    var count = make('div', 'base-setup-count', { 'aria-live': 'polite' });
    var bar: StepperHandle = createStepper({
        layout: 'segments',
        clickable: 'all',
        navLabel: options.navLabel || 'Setup progress',
        completedText: labels.done,
        attentionText: labels.attention,
        currentText: labels.todo,
        upcomingText: labels.todo,
        optionalText: labels.optional,
        onSelect: function (id: string | number): void { open(String(id), true); }
    });
    summary.appendChild(count);
    summary.appendChild(bar.element);
    var list = make('div', 'base-setup-steps');
    root.appendChild(summary);
    root.appendChild(list);

    function indexOf(key: string): number {
        for (var i = 0; i < steps.length; i++) if (steps[i].key === key) return i;
        return -1;
    }

    function badgeFor(state: SetupStepState): CollapsibleBadge {
        return { label: labels[state], color: COLORS[state] };
    }

    // Draws the summary count and the segments from the steps' states, marking the first step that is not done as current.
    function drawSummary(): void {
        var done = 0;
        steps.forEach(function (step: SetupStep): void { if (step.state === 'done') done++; });
        count.textContent = fillAll(options!.summaryText || '{done} of {total} done', { done: done, total: steps.length });
        var at = firstOpenStep(steps.map(function (step: SetupStep) { return step.state; }));
        bar.setItems(steps.map(function (step: SetupStep, index: number): StepperStep {
            // The next step to work on shows as current, unless it needs attention, which says more.
            var state: StepperStepState = index === at && step.state === 'todo' ? 'current' : SEGMENT[step.state as SetupStepState];
            return { id: step.key, label: step.title, state: state };
        }), at === -1 ? undefined : at);
    }

    function open(key: string, focus?: boolean): void {
        var at = indexOf(key);
        if (at === -1) return;
        sections[at].setValue(true);
        if (focus) {
            var header = sections[at].header;
            if (header.scrollIntoView) header.scrollIntoView({ block: 'nearest' });
            header.focus();
        }
    }

    function build(step: SetupStep): CollapsibleSectionHandle {
        var body = make('div', 'base-setup-step-body');
        if (step.content instanceof Node) body.appendChild(step.content);
        else if (typeof step.content === 'string') body.innerHTML = step.content;
        if (step.action && step.action.text) {
            var spec = step.action;
            var row = make('div', 'base-collapsible-actions flush');
            var button = make('button', 'raised base-button ' + (spec.className || 'primary'), { type: 'button' }, spec.text);
            cleanups.push(listen(button, 'click', function (): void { if (spec.onClick) spec.onClick(step.key); }));
            row.appendChild(button);
            body.appendChild(row);
        }
        return createCollapsibleSection({
            title: step.title,
            badge: badgeFor(step.state as SetupStepState),
            content: body,
            collapsed: true,
            numbered: true,
            className: 'base-setup-step'
        });
    }

    function setItems(next: SetupStep[] | null | undefined): void {
        runAll(cleanups);
        sections.forEach(function (section: CollapsibleSectionHandle): void { section.destroy(); });
        clear(list);
        steps = (next || []).map(function (step: SetupStep): SetupStep {
            return { key: String(step.key), title: step.title, state: setupState(step.state), content: step.content, action: step.action };
        });
        sections = steps.map(build);
        sections.forEach(function (section: CollapsibleSectionHandle): void { list.appendChild(section.element); });
        var at = firstOpenStep(steps.map(function (step: SetupStep) { return step.state; }));
        if (at !== -1) sections[at].setValue(true);
        drawSummary();
    }

    function setState(key: string, state: SetupStepState): void {
        var at = indexOf(key);
        if (at === -1) return;
        var next = setupState(state);
        if (steps[at].state === next) return;
        steps[at].state = next;
        sections[at].setBadge(badgeFor(next));
        // A step that turns done hands the reader on to the next one that is not, if it was open.
        if (next === 'done' && options!.autoAdvance !== false && sections[at].getValue()) {
            var following = firstOpenStep(steps.map(function (step: SetupStep) { return step.state; }));
            sections[at].setValue(false);
            if (following !== -1) sections[following].setValue(true);
        }
        drawSummary();
        if (options!.onStateChange) options!.onStateChange(key, next);
    }

    setItems(options.steps);

    return {
        element: root,
        getValue: function (): Record<string, SetupStepState> {
            var out: Record<string, SetupStepState> = {};
            steps.forEach(function (step: SetupStep): void { out[step.key] = step.state as SetupStepState; });
            return out;
        },
        setValue: function (states: Record<string, SetupStepState>): void {
            Object.keys(states || {}).forEach(function (key: string): void { setState(key, states[key]); });
        },
        getState: function (key: string): SetupStepState | null {
            var at = indexOf(key);
            return at === -1 ? null : steps[at].state as SetupStepState;
        },
        setState: setState,
        setItems: setItems,
        open: function (key: string): void { open(key, false); },
        destroy: function (): void {
            runAll(cleanups);
            sections.forEach(function (section: CollapsibleSectionHandle): void { section.destroy(); });
            bar.destroy();
        }
    };
}
