import { make, clear, fill, iconButton, listen, focusAfterRemove } from './dom.js';
import { buildThumb, hasThumbSource } from './thumb.js';
import type { ThumbSource } from './thumb.js';

/** What renderChips takes. removeText is a template where {value} is the chip's label. */
export interface ChipsOptions {
    labels: string[];
    removeText: string;
    pill?: boolean;
    thumbs?: ThumbSource[];
    input?: HTMLElement | null;
    onRemove(index: number): void;
}

/**
 * Moves focus after a removal to the remove button now at the removed index, the last one when the removed item was last, or the fallback when none is left.
 * Internal to the chip and picked item lists.
 *
 * @param buttons the remove buttons left after the removal
 * @param index where the removed item was
 * @param fallback what takes focus when no remove button is left [optional]
 */
export { focusAfterRemove };

/**
 * Draws one removable base-tag chip per label into a base-tags row, each with a close button that has a title and an aria-label. A remove calls onRemove, which draws the chips again, and then focus moves to the next remove button or the input.
 * Internal to createChipSelect and createTagInput.
 *
 * @param tags the base-tags row to fill
 * @param opts {
 *   labels     : the text of each chip
 *   removeText : title and aria-label of each remove button, where {value} is the chip's label
 *   pill       : draw each chip as a round base-tag-pill (default false)
 *   thumbs     : a picture per chip, an address or a function as the thumb core takes, drawn round before the label [optional]
 *   input      : what takes focus when the last chip goes [optional]
 *   onRemove   : function(index) that removes the item and draws the chips again
 * }
 */
export function renderChips(tags: HTMLElement, opts: ChipsOptions): void {
    clear(tags);
    opts.labels.forEach(function (label, index) {
        var chip = make('span', 'base-tag' + (opts.pill ? ' base-tag-pill' : ''));
        var picture = opts.thumbs ? opts.thumbs[index] : null;
        if (hasThumbSource(picture)) {
            chip.classList.add('has-thumb');
            chip.appendChild(buildThumb({ src: picture, icon: 'image', className: 'base-tag-thumb' }).element);
        }
        chip.appendChild(make('span', null, null, label));
        var remove = iconButton('base-tag-remove', 'close', fill(opts.removeText, label));
        listen(remove, 'click', function () {
            opts.onRemove(index);
            focusAfterRemove(tags.querySelectorAll<HTMLElement>('.base-tag-remove'), index, opts.input);
        });
        chip.appendChild(remove);
        tags.appendChild(chip);
    });
}

/**
 * Removes the last chip when Backspace is pressed in an empty input.
 * Internal to createChipSelect and createTagInput.
 *
 * @param input the text input beside the chips
 * @param count function returning how many chips there are
 * @param removeLast function that removes the last chip
 * @returns the function that removes the listener.
 */
export function bindBackspaceRemove(input: HTMLInputElement, count: () => number, removeLast: () => void): () => void {
    return listen(input, 'keydown', function (e: KeyboardEvent) {
        if (e.key === 'Backspace' && input.value === '' && count() > 0) removeLast();
    });
}
