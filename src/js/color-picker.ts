import { make, listen, runAll, nextId, applyFieldSize } from './lib/dom.js';
import { parseColor, toHexColor } from './lib/color.js';
import type { Rgba } from './lib/color.js';
import { adornField } from './field-adornments.js';
import { createFieldMessage } from './field-message.js';
import { bindValidation } from './lib/validate.js';
import type { ComponentHandle } from './types.js';

/** What createColorPicker takes. alpha turns on the opacity box and an #rrggbbaa value, opacityOnly shows only the opacity box, and format 'argb' reads and writes #aarrggbb. */
export interface ColorPickerOptions {
    value?: string;
    alpha?: boolean;
    opacityOnly?: boolean;
    format?: 'hex' | 'argb';
    label?: string;
    pickLabel?: string;
    opacityLabel?: string;
    invalidText?: string;
    size?: 'small' | 'medium' | 'large';
    validate?(value: string): string | null | undefined;
    onChange?(value: string): void;
}

/** What createColorPicker returns. getValue is a hex code, and getRgba the same color as numbers. */
export interface ColorPickerHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): string;
    setValue(value: string): void;
    getRgba(): Rgba;
    isValid(): boolean;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    setOpacityOnly(on: boolean): void;
    destroy(): void;
}

/**
 * A color field: a swatch inside the box that opens the browser's color picker, then a fixed # and the hex digits,
 * which also take typed rgb() text. It is RGB by default. With alpha, an opacity box in percent sits beside it on the same
 * line, with the shared up and down arrows, and the value is #rrggbbaa. Both boxes check through the validation core: text
 * that is not a color, or an opacity outside 0 to 100, shows a message under the field and leaves the value as it was.
 *
 * @param options {
 *   value        : first color, as hex or rgb() text (default '#000000')
 *   alpha        : true adds the opacity box and gives #rrggbbaa values (default false, and true with format 'argb' or opacityOnly)
 *   opacityOnly  : true hides the color and shows only the opacity box, for a color that comes from elsewhere, such as an image (default false)
 *   format       : 'hex' for #rrggbb or #rrggbbaa, or 'argb' to read and write #aarrggbb, as .NET colors take it (default 'hex')
 *   label        : aria-label of the hex field (default 'Color')
 *   pickLabel    : title and aria-label of the swatch (default 'Pick a color')
 *   opacityLabel : aria-label of the opacity box (default 'Opacity')
 *   invalidText  : message for text that is not a color (default 'Enter a color such as #3498db.')
 *   size         : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   validate     : function(value) returning an error sentence for a color, or an empty value when valid [optional]
 *   onChange     : function(value) called with the hex code after each change [optional]
 * }
 * @returns { element, input, getValue, setValue, getRgba, isValid, setSize, setOpacityOnly, destroy }. setOpacityOnly(on) switches between the whole field and the opacity box alone, keeping the color.
 */
export function createColorPicker(options?: ColorPickerOptions): ColorPickerHandle {
    options = options || {};
    var argb = options.format === 'argb';
    var alpha = options.alpha === true || options.opacityOnly === true || (argb && options.alpha !== false);
    var cleanups: Array<() => void> = [];
    var color: Rgba = readColor(options.value) || { r: 0, g: 0, b: 0, a: 1 };
    if (!alpha) color.a = 1;

    var root = make('div', 'base-color-picker' + (alpha ? ' alpha' : '') + (alpha && options.opacityOnly ? ' opacity-only' : ''));
    applyFieldSize(root, options.size);
    var box = make('div', 'base-color-picker-box');
    var swatch = make('span', 'base-color-swatch');
    var fill = make('span', 'base-color-swatch-fill');
    // The browser's own picker sits invisible over the swatch, so a click on the swatch opens it.
    var native = make('input', 'base-color-native', { type: 'color', title: options.pickLabel || 'Pick a color', 'aria-label': options.pickLabel || 'Pick a color' });
    swatch.appendChild(fill);
    swatch.appendChild(native);
    var input = make('input', 'base-mono base-color-text', { type: 'text', 'aria-label': options.label || 'Color', autocomplete: 'off', spellcheck: 'false' });
    input.id = nextId('color');
    box.appendChild(swatch);
    // The # is part of the box, so only the digits are typed.
    box.appendChild(make('span', 'base-color-hash', { 'aria-hidden': 'true' }, '#'));
    box.appendChild(input);
    var row = make('div', 'base-color-picker-row');
    row.appendChild(box);
    root.appendChild(row);

    // The opacity is a number box in percent on the same line, with the up and down arrows every number gets.
    var opacity: HTMLInputElement | null = null;
    if (alpha) {
        var opacityBox = make('div', 'base-color-alpha');
        opacity = make('input', 'base-color-alpha-input', { type: 'number', min: '0', max: '100', step: '1', 'aria-label': options.opacityLabel || 'Opacity' });
        opacityBox.appendChild(opacity);
        opacityBox.appendChild(make('span', 'base-color-alpha-unit', { 'aria-hidden': 'true' }, '%'));
        row.appendChild(opacityBox);
        var adorned = adornField(opacity);
        cleanups.push(function () { adorned.destroy(); });
    }
    var message = createFieldMessage({ input: input, id: nextId('color-message') });
    root.appendChild(message.element);
    var opacityMessage = opacity ? createFieldMessage({ input: opacity, id: nextId('color-message') }) : null;
    if (opacityMessage) root.appendChild(opacityMessage.element);

    // A color option as numbers. With argb, eight digits read as #aarrggbb.
    function readColor(raw: unknown): Rgba | null {
        if (argb && typeof raw === 'string' && /^#?[0-9a-f]{8}$/i.test(raw.trim())) {
            var digits = raw.trim().replace(/^#/, '');
            return parseColor('#' + digits.slice(2) + digits.slice(0, 2));
        }
        return parseColor(raw);
    }

    function value(): string {
        var hex = toHexColor(color, alpha || argb);
        return argb ? '#' + hex.slice(7, 9) + hex.slice(1, 7) : hex;
    }

    // Draws the swatch, the hex text, the native picker, and the slider from the current color.
    function draw(keepText?: boolean): void {
        fill.style.background = 'rgba(' + color.r + ', ' + color.g + ', ' + color.b + ', ' + color.a + ')';
        native.value = toHexColor(color, false);
        // The digits show the color only, since the opacity box holds the alpha.
        if (!keepText) input.value = toHexColor(color, false).slice(1);
        if (opacity && document.activeElement !== opacity) opacity.value = String(Math.round(color.a * 100));
    }

    function changed(): void {
        if (options!.onChange) options!.onChange(value());
    }

    // Reads typed text. A color updates everything but the text being typed; anything else shows the message.
    // The text as a color: rgb() as typed, and anything else as hex digits after the box's #.
    function textColor(): string {
        var t = input.value.trim();
        return /^rgba?\(/i.test(t) ? t : '#' + t.replace(/^#+/, '');
    }

    function readText(final: boolean): void {
        var next = parseColor(textColor());
        if (!next) {
            if (final) hexCheck.check();
            return;
        }
        if (!alpha) next.a = 1;
        // Text with no alpha keeps the opacity the slider set.
        else if (!/^#([0-9a-f]{4}|[0-9a-f]{8})$/i.test(textColor()) && !/^rgba/i.test(textColor())) next.a = color.a;
        color = next;
        draw(!final);
        changed();
        if (final) hexCheck.check();
    }

    cleanups.push(listen(input, 'input', function () { readText(false); }));
    cleanups.push(listen(input, 'change', function () { readText(true); }));
    var hexCheck = bindValidation(input, {
        message: message,
        validate: function () {
            if (!parseColor(textColor())) return options!.invalidText || 'Enter a color such as #3498db.';
            return options!.validate ? options!.validate(value()) : '';
        }
    });
    cleanups.push(hexCheck.destroy);
    cleanups.push(listen(native, 'input', function () {
        var picked = parseColor(native.value);
        if (!picked) return;
        picked.a = color.a;
        color = picked;
        draw();
        changed();
        hexCheck.check();
    }));
    if (opacity) {
        var opacityCheck = bindValidation(opacity, { message: opacityMessage });
        cleanups.push(opacityCheck.destroy);
        // An opacity outside 0 to 100, or not whole, is refused and leaves the color as it was.
        var readOpacity = function (): void {
            if (opacity!.value === '' || !opacityCheck.isValid()) return;
            color = { r: color.r, g: color.g, b: color.b, a: parseFloat(opacity!.value) / 100 };
            draw();
            changed();
        };
        cleanups.push(listen(opacity, 'input', readOpacity));
        cleanups.push(listen(opacity, 'change', function () { readOpacity(); opacityCheck.check(); }));
    }

    draw();

    return {
        element: root,
        input: input,
        getValue: value,
        setValue: function (next: string) {
            var parsed = readColor(next);
            if (!parsed) return;
            if (!alpha) parsed.a = 1;
            color = parsed;
            hexCheck.clear();
            if (opacity) { opacity.value = String(Math.round(color.a * 100)); opacityCheck.clear(); }
            draw();
        },
        getRgba: function () { return { r: color.r, g: color.g, b: color.b, a: color.a }; },
        isValid: function () { return (root.classList.contains('opacity-only') || hexCheck.isValid()) && (!opacity || opacityCheck.isValid()); },
        setOpacityOnly: function (on: boolean) { root.classList.toggle('opacity-only', !!on && !!opacity); },
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        destroy: function () {
            runAll(cleanups);
            message.destroy();
            if (opacityMessage) opacityMessage.destroy();
        }
    };
}
