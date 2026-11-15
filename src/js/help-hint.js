import { make, icon, nextId, listen, runAll, claimEscape, placeBox, viewport } from './dom-util.js';

// createHelpHint
// A small help icon button for next to a label, with a bubble that explains the field. The bubble shows on hover and focus, and a click or tap toggles it. The button is described by the bubble through aria-describedby, and Escape or a click outside closes it.
//
// Param: options | {
//   text  : the explanation, plain text [required]
//   label : aria-label of the button (default 'Help')
//   icon  : Material icon name (default 'help_outline')
// }
// Returns { element, getValue, setValue, show, hide, destroy }. getValue returns the text, and setValue replaces it.
export function createHelpHint(options) {
    options = options || {};
    if (typeof options.text !== 'string') throw new Error('createHelpHint needs a text string');
    var cleanups = [];
    var docCleanups = [];
    var followCleanups = [];
    var hovered = false;
    var focused = false;

    var root = make('span', 'jpk-help');
    var button = make('button', 'jpk-help-button', { type: 'button', title: options.label || 'Help', 'aria-label': options.label || 'Help' });
    button.appendChild(icon(options.icon || 'help_outline'));
    var bubble = make('span', 'jpk-help-tip', { role: 'tooltip' }, options.text);
    bubble.id = nextId('help');
    button.setAttribute('aria-describedby', bubble.id);
    root.appendChild(button);
    root.appendChild(bubble);

    // Fixed to the viewport so a panel or a scrolling area never clips it and a narrow screen keeps it on screen.
    function place() {
        bubble.style.top = '0px';
        bubble.style.left = '0px';
        var box = bubble.getBoundingClientRect();
        var spot = placeBox(button.getBoundingClientRect(), { width: box.width, height: box.height }, viewport(), { align: 'start', gap: 6 });
        bubble.style.top = spot.top + 'px';
        bubble.style.left = spot.left + 'px';
    }

    // Tracks the scroll and the size of the window while the bubble is showing, by hover, focus, or a tap.
    function follow() {
        if (followCleanups.length) return;
        place();
        followCleanups.push(listen(window, 'scroll', place, true));
        followCleanups.push(listen(window, 'resize', place));
    }

    function hide() {
        root.classList.remove('open');
        claimEscape(root, false);
        runAll(docCleanups);
        if (!hovered && !focused) runAll(followCleanups);
    }

    function show() {
        if (root.classList.contains('open')) return;
        root.classList.add('open');
        claimEscape(root, true);
        follow();
        docCleanups.push(listen(document, 'click', function (e) { if (!root.contains(e.target)) hide(); }));
    }

    cleanups.push(listen(button, 'click', function () {
        if (root.classList.contains('open')) hide();
        else show();
    }));
    cleanups.push(listen(root, 'mouseenter', function () { hovered = true; follow(); }));
    cleanups.push(listen(root, 'mouseleave', function () { hovered = false; if (!focused && !root.classList.contains('open')) runAll(followCleanups); }));
    cleanups.push(listen(root, 'focusin', function () { focused = true; follow(); }));
    cleanups.push(listen(root, 'focusout', function () { focused = false; if (!hovered && !root.classList.contains('open')) runAll(followCleanups); }));
    cleanups.push(listen(root, 'keydown', function (e) { if (e.key === 'Escape') hide(); }));

    return {
        element: root,
        getValue: function () { return bubble.textContent; },
        setValue: function (text) { bubble.textContent = text || ''; },
        show: show,
        hide: hide,
        destroy: function () { hide(); runAll(followCleanups); runAll(cleanups); }
    };
}
