import { openDialog } from './dialog.js';
import type { DialogHandle } from './dialog.js';
import { bindValidation, validateAll } from './lib/validate.js';
import type { ValidationHandle } from './lib/validate.js';
import { baseText } from './lib/base-text.js';

/** One field in a prompt dialog. A select reads options as value and label pairs, and required and validate check it through the validation core. */
export interface PromptDialogField {
    name: string;
    label?: string;
    description?: string;
    type?: 'text' | 'number' | 'password' | 'textarea' | 'select' | string;
    value?: string | number | null;
    placeholder?: string;
    required?: boolean;
    min?: number;
    max?: number;
    options?: Array<{ value: string | number; label?: string | number | null }>;
    validate?(value: string): string | null | undefined;
}

/** What promptDialog takes, the title and the two button labels. */
export interface PromptDialogOptions {
    title?: string;
    submitText?: string;
    cancelText?: string;
}

/**
 * Opens a small form that resolves to a { name: value } map, or to null when cancelled. Done checks every field through
 * the validation core and stays open while one is invalid, with focus on the first.
 *
 * @param fields [{ name, label, description, type, value, placeholder, required, min, max, options, validate }], where type is text, number, password, textarea, or select (default text), a select reads options as [{ value, label }], description is a sentence under the field, and validate(value) returns an error sentence or an empty value
 * @param opts { title, submitText (default 'Done'), cancelText (default 'Cancel') } [optional]
 */
export function promptDialog(fields: PromptDialogField[], opts?: PromptDialogOptions): Promise<Record<string, string> | null> {
    opts = opts || {};
    fields = fields || [];
    return new Promise<Record<string, string> | null>(function (resolve): void {
        var settled: boolean = false;
        function done(value: Record<string, string> | null): void { if (!settled) { settled = true; resolve(value); } }

        var form: HTMLDivElement = document.createElement('div');
        var controls: Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = {};
        var checks: ValidationHandle[] = [];
        fields.forEach(function (f: PromptDialogField): void {
            var wrap = document.createElement('div');
            wrap.className = 'base-modal-field';
            if (f.label) {
                var label = document.createElement('div');
                label.className = 'base-modal-field-label';
                label.textContent = f.label;
                wrap.appendChild(label);
            }
            var control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
            if (f.type === 'textarea') {
                control = document.createElement('textarea');
            } else if (f.type === 'select') {
                control = document.createElement('select');
                (f.options || []).forEach(function (o): void {
                    var opt: HTMLOptionElement = document.createElement('option');
                    opt.value = o.value as string;
                    opt.textContent = (o.label != null ? o.label : o.value) as string;
                    control.appendChild(opt);
                });
            } else {
                control = document.createElement('input');
                control.type = f.type || 'text';
            }
            control.className = 'base-edit-input';
            if (f.placeholder) (control as HTMLInputElement).placeholder = f.placeholder;
            if (f.value != null) control.value = f.value as string;
            if (f.required) control.setAttribute('required', '');
            if (typeof f.min === 'number') control.setAttribute('min', String(f.min));
            if (typeof f.max === 'number') control.setAttribute('max', String(f.max));
            if (f.label) control.setAttribute('aria-label', f.label);
            controls[f.name] = control;
            wrap.appendChild(control);
            if (f.description) {
                var description = document.createElement('div');
                description.className = 'fieldDescription';
                description.textContent = f.description;
                wrap.appendChild(description);
            }
            checks.push(bindValidation(control, { validate: f.validate ? function (value: string) { return f.validate!(value); } : undefined }));
            form.appendChild(wrap);
        });

        // Closes with the values only when every field is valid.
        function submit(close: (value: Record<string, string> | null) => void): void {
            if (validateAll(form)) close(collect());
        }

        function collect(): Record<string, string> {
            var out: Record<string, string> = {};
            Object.keys(controls).forEach(function (k: string): void { out[k] = controls[k].value; });
            return out;
        }

        var handle: DialogHandle = openDialog({
            title: opts.title || '',
            size: 'small',
            body: form,
            buttons: [
                { text: opts.cancelText || baseText('ButtonCancel'), className: 'base-button secondary', action: function (close): void { close(null); } },
                { text: opts.submitText || baseText('Base.Done'), className: 'base-button primary', action: function (close): void { submit(close); } }
            ],
            onClose: function (value: Record<string, string> | null): void {
                checks.forEach(function (c) { c.destroy(); });
                done(value || null);
            }
        });

        // A prefilled first field is selected so typing replaces it.
        var firstControl: HTMLInputElement | null = fields.length ? controls[fields[0].name] as HTMLInputElement : null;
        if (firstControl && document.activeElement === firstControl && firstControl.select && firstControl.tagName !== 'SELECT') {
            firstControl.select();
        }

        // Enter in a single line input submits the form.
        form.addEventListener('keydown', function (e: KeyboardEvent): void {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                submit(handle.close);
            }
        });
    });
}
