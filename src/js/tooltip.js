import { make, nextId, listen, runAll, addToken, removeToken, placeBox, viewport } from './dom-util.js';

var TIP_ATTR = 'data-jpk-tip';
var NATIVE_FOCUS = /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/;

// setTooltip
// Gives an element tooltip text through the data-jpk-tip attribute that bindTooltips reads. A target that cannot take focus gets tabindex 0 so the tooltip also shows from the keyboard.
//
// Param: target    | element
// Param: text      | the tooltip sentence or phrase
// Param: placement | 'top' or 'bottom' [optional]
// Returns the target.
export function setTooltip(target, text, placement) {
    target.setAttribute(TIP_ATTR, text);
    if (placement) target.setAttribute('data-jpk-tip-placement', placement);
    if (!NATIVE_FOCUS.test(target.tagName) && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '0');
    return target;
}

// bindTooltips
// Shows a floating tooltip when the pointer rests on, or keyboard focus reaches, any element under root that has a data-jpk-tip attribute. Escape, scrolling, and leaving the element hide it, and aria-describedby points at the tip while it shows.
//
// Param: root    | element whose descendants carry data-jpk-tip [optional, default the document body]
// Param: options | { placement: 'top' or 'bottom' (default 'top') }
// Returns { element, show, hide, destroy }. show(target) shows the tip for one element.
// Set data-jpk-tip-placement on an element to override the placement. The tip flips to the other side when it would leave the screen.
export function bindTooltips(root, options) {
    options = options || {};
    root = root || document.body;
    var cleanups = [];
    var current = null;

    var tip = make('div', 'jpk-tooltip', { role: 'tooltip' });
    tip.id = nextId('tip');
    tip.hidden = true;
    document.body.appendChild(tip);

    function place(target) {
        var box = tip.getBoundingClientRect();
        var preferBottom = (target.getAttribute('data-jpk-tip-placement') || options.placement) === 'bottom';
        var spot = placeBox(target.getBoundingClientRect(), { width: box.width, height: box.height }, viewport(), { align: 'center', prefer: preferBottom ? 'below' : 'above', gap: 8 });
        tip.style.top = spot.top + 'px';
        tip.style.left = spot.left + 'px';
    }

    function hide() {
        if (!current) return;
        removeToken(current, 'aria-describedby', tip.id);
        current = null;
        tip.hidden = true;
    }

    function show(target) {
        var text = target && target.getAttribute(TIP_ATTR);
        if (!text) return;
        if (current && current !== target) hide();
        current = target;
        tip.textContent = text;
        tip.hidden = false;
        addToken(target, 'aria-describedby', tip.id);
        place(target);
    }

    function targetOf(e) {
        var found = e.target && e.target.closest ? e.target.closest('[' + TIP_ATTR + ']') : null;
        return found && root.contains(found) ? found : null;
    }

    cleanups.push(listen(root, 'mouseover', function (e) { var t = targetOf(e); if (t) show(t); }));
    cleanups.push(listen(root, 'mouseout', function (e) {
        var t = targetOf(e);
        if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) hide();
    }));
    cleanups.push(listen(root, 'focusin', function (e) { var t = targetOf(e); if (t) show(t); }));
    cleanups.push(listen(root, 'focusout', function (e) { if (targetOf(e)) hide(); }));
    cleanups.push(listen(document, 'keydown', function (e) { if (e.key === 'Escape') hide(); }));
    cleanups.push(listen(document, 'scroll', hide, true));

    return {
        element: tip,
        show: show,
        hide: hide,
        destroy: function () {
            hide();
            runAll(cleanups);
            if (tip.parentNode) tip.parentNode.removeChild(tip);
        }
    };
}
