import { make, listen, runAll } from './lib/dom.js';
import { setStatus } from './status-text.js';
import { validateAll } from './lib/validate.js';
import type { ComponentHandle } from './types.js';
import { baseText } from './lib/base-text.js';

/** The states a save bar shows above its button. '' shows nothing. */
export type SaveBarState = '' | 'pending' | 'saving' | 'saved' | 'failed';

/** What createSaveBar takes. onSave runs on Save, and a promise it returns decides saved or failed, where an Error it rejects with gives the failed line its message. form is checked first, and an invalid field stops the save. */
export interface SaveBarOptions {
    form?: ParentNode | null;
    invalidText?: string;
    saveText?: string;
    pendingText?: string;
    savingText?: string;
    savedText?: string;
    failedText?: string;
    savedMs?: number;
    fill?: boolean;
    state?: SaveBarState;
    onSave?(): unknown;
}

/** What createSaveBar returns. setDirty shows or clears the pending line, and setState shows any state. */
export interface SaveBarHandle extends ComponentHandle {
    button: HTMLButtonElement;
    status: HTMLElement;
    getState(): SaveBarState;
    setState(state: SaveBarState, text?: string): void;
    setDirty(dirty: boolean): void;
    save(): Promise<boolean>;
    destroy(): void;
}

// The message a failed save carries: an Error's message, or text. Anything else falls back to the failed line.
function reasonText(reason: unknown): string | undefined {
    var text = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
    text = String(text || '').trim();
    return text || undefined;
}

/**
 * A Save button with a status line above it, built on the status line every message uses. The line says the page has
 * unsaved changes, that it is saving, that the changes saved, or that the save failed, each with its state's icon and
 * color. Save runs onSave, shows Saving while a promise it returns is pending, then Changes Saved or Could Not Save.
 * When onSave throws or rejects with an Error, or with text, that message is the failed line, such as the server's reason.
 * The saved line fades after savedMs, and a failure stays until the next change or save. With form, Save first checks
 * every field in it through the validation core, and refuses to save while one is invalid.
 *
 * @param options {
 *   form        : the form, section, or page whose fields Save checks first [optional]
 *   invalidText : the failed line while a field is invalid (default 'Fix the fields marked in red.')
 *   saveText    : the button's label (default 'Save')
 *   pendingText : the line while changes are unsaved (default 'Unsaved changes.')
 *   savingText  : the line while saving (default 'Saving…')
 *   savedText   : the line after a save (default 'Changes saved.')
 *   failedText  : the line after a failed save, when onSave gives no message of its own (default 'Could not save.')
 *   savedMs     : how long the saved line stays (default 4000)
 *   fill        : true makes the button span the width (default false)
 *   state       : the state to start in [optional]
 *   onSave      : function() run on Save, which may return a promise [optional]
 * }
 * @returns { element, button, status, getState, setState, setDirty, save, destroy }
 */
export function createSaveBar(options?: SaveBarOptions): SaveBarHandle {
    var opts = options || {};
    var cleanups: Array<() => void> = [];
    var state: SaveBarState = '';
    var timer: ReturnType<typeof setTimeout> | null = null;

    var root = make('div', 'base-save-bar');
    var status = make('div', 'base-status-text base-save-status');
    var button = make('button', 'raised base-button primary base-save-button' + (opts.fill ? ' fill' : ''), { type: 'button' }, opts.saveText || baseText('Save'));
    root.appendChild(status);
    root.appendChild(button);

    var TEXT: Record<string, string> = {
        pending: opts.pendingText || baseText('Base.UnsavedChangesMessage'),
        saving: opts.savingText || baseText('Base.Saving'),
        saved: opts.savedText || baseText('Base.ChangesSaved'),
        failed: opts.failedText || baseText('Base.CouldNotSave')
    };
    var LOOK: Record<string, 'warn' | 'info' | 'success' | 'error'> = { pending: 'warn', saving: 'info', saved: 'success', failed: 'error' };

    function setState(next: SaveBarState, text?: string): void {
        if (timer) { clearTimeout(timer); timer = null; }
        state = next;
        root.setAttribute('data-state', next);
        button.disabled = next === 'saving';
        if (!next) { setStatus(root, status, '', false); return; }
        setStatus(root, status, text || TEXT[next], next === 'failed', { timeout: 0, state: LOOK[next] });
        // The saved line fades on its own, and every other state stays until something changes.
        if (next === 'saved') {
            timer = setTimeout(function () { if (state === 'saved') setState(''); }, opts.savedMs === undefined ? 4000 : opts.savedMs);
        }
    }

    function save(): Promise<boolean> {
        if (opts.form && !validateAll(opts.form)) {
            setState('failed', opts.invalidText || baseText('Base.FixFields'));
            return Promise.resolve(false);
        }
        setState('saving');
        return Promise.resolve().then(function () { return opts.onSave ? opts.onSave() : undefined; }).then(function () {
            setState('saved');
            return true;
        }, function (reason: unknown) {
            setState('failed', reasonText(reason));
            return false;
        });
    }

    cleanups.push(listen(button, 'click', function () { save(); }));
    if (opts.state) setState(opts.state);

    return {
        element: root,
        button: button,
        status: status,
        getState: function () { return state; },
        setState: setState,
        setDirty: function (dirty) {
            if (dirty) setState('pending');
            else if (state === 'pending' || state === 'failed') setState('');
        },
        save: save,
        destroy: function () { if (timer) clearTimeout(timer); runAll(cleanups); }
    };
}
