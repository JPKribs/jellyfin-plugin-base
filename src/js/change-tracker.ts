import type { Shared, ChangeTracker, ChangeTrackerOptions } from './types.js';

/**
 * Compares a serialized snapshot with the current state and drives the unsaved indicator. The bag calls it as shared.createChangeTracker, with the bag as this.
 *
 * @param opts { serialize, indicatorId, indicator, savedText } [optional]
 */
export function createChangeTracker(this: Shared, opts?: ChangeTrackerOptions): ChangeTracker {
    opts = opts || {};
    var serialize = opts.serialize || function () { return ''; };
    var indicator: HTMLElement | null = opts.indicatorId ? this.getEl(opts.indicatorId) : (opts.indicator || null);
    var snapshot = serialize();
    var savedText = opts.savedText;
    var flashTimer: ReturnType<typeof setTimeout> | null = null;
    var flashOriginal: string | null = null;
    // The indicator announces itself politely when it appears.
    if (indicator && !indicator.getAttribute('role')) indicator.setAttribute('role', 'status');
    function setVisible(dirty: boolean) {
        if (indicator) indicator.classList.toggle('visible', dirty);
    }
    // The last text of the indicator, so the dot before it stays.
    function labelNode(): ChildNode | null {
        var nodes: ArrayLike<ChildNode> = indicator!.childNodes || [];
        for (var i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].nodeType === 3 && String(nodes[i].nodeValue).trim()) return nodes[i];
        }
        return null;
    }
    function readLabel() {
        var node = labelNode();
        return node ? node.nodeValue : indicator!.textContent;
    }
    function writeLabel(text: string) {
        var node = labelNode();
        if (node) node.nodeValue = text;
        else if (!indicator!.children || !indicator!.children.length) indicator!.textContent = text;
    }
    return {
        isDirty: function () { return serialize() !== snapshot; },
        check: function () { var d = serialize() !== snapshot; setVisible(d); return d; },
        markClean: function () { snapshot = serialize(); setVisible(false); },
        flashSaved: function () {
            snapshot = serialize();
            if (!indicator) return;
            if (flashTimer) clearTimeout(flashTimer);
            if (savedText) {
                if (flashOriginal === null) flashOriginal = readLabel();
                writeLabel(savedText);
            }
            indicator.classList.add('visible', 'save-success');
            flashTimer = setTimeout(function () {
                indicator!.classList.remove('visible', 'save-success');
                if (flashOriginal !== null) { writeLabel(flashOriginal); flashOriginal = null; }
                flashTimer = null;
            }, 1500);
        }
    };
}
