import { make, clear, has } from './dom-util.js';

var COLORS = ['blue', 'purple', 'teal', 'pink', 'orange', 'green'];
var STATUS_LABELS = { green: 'Active', red: 'Error', orange: 'Waiting', purple: 'Working', blue: 'Info', gray: 'Off' };

// Takes up to two initials from a name.
function initialsOf(name) {
    var words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    var first = words[0].charAt(0);
    var last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
}

// Picks the same color for the same name every time.
function colorOf(name) {
    var sum = 0;
    for (var i = 0; i < name.length; i++) sum = (sum + name.charCodeAt(i) * (i + 1)) % 9973;
    return COLORS[sum % COLORS.length];
}

// Builds the avatar element and the function that redraws it, for createAvatar and createUserChip.
function buildAvatar(spec, quiet) {
    var root = make('span', 'jpk-avatar');
    var state = {};
    // A late image error from an earlier draw must not wipe what a newer draw put in.
    var drawn = 0;

    function redraw(next) {
        var mine = ++drawn;
        state = {
            src: next.src || '',
            name: next.name || '',
            size: next.size === 'small' || next.size === 'large' ? next.size : 'medium',
            color: next.color || '',
            status: has(STATUS_LABELS, next.status) ? next.status : '',
            statusLabel: next.statusLabel || ''
        };
        clear(root);
        root.removeAttribute('role');
        root.removeAttribute('aria-label');
        var color = state.color || colorOf(state.name);
        root.className = 'jpk-avatar jpk-avatar-' + state.size + ' ' + color;
        var initials = initialsOf(state.name);
        function showInitials() {
            clear(root);
            if (state.name && !quiet) {
                root.setAttribute('role', 'img');
                root.setAttribute('aria-label', state.name);
            }
            root.appendChild(make('span', 'jpk-avatar-initials', { 'aria-hidden': 'true' }, initials));
            addDot();
        }
        function addDot() {
            if (!state.status) return;
            var label = state.statusLabel || STATUS_LABELS[state.status];
            root.appendChild(make('span', 'jpk-avatar-status ' + state.status, { role: 'img', title: label, 'aria-label': label }));
        }
        if (state.src) {
            var img = make('img', 'jpk-avatar-image', { src: state.src, alt: state.name });
            img.addEventListener('error', function () { if (mine === drawn) showInitials(); });
            root.appendChild(img);
            addDot();
        } else {
            showInitials();
        }
        if (state.name) root.setAttribute('title', state.name);
        else root.removeAttribute('title');
    }

    redraw(spec);
    return { root: root, redraw: redraw, get: function () { return state; } };
}

// createAvatar
// A round picture of a person or thing. It shows the image, and shows initials from the name when there is no image or the image fails to load. A status color adds a dot with a name.
//
// Param: options | {
//   src         : image address [optional]
//   name        : the person's name, for the initials, the alt text, the title, and the label of an initials only avatar [optional]
//   size        : 'small', 'medium', or 'large' (default 'medium')
//   color       : status color name for the initials background (default one chosen from the name)
//   status      : 'green', 'red', 'orange', 'purple', 'blue', or 'gray' for a status dot [optional]
//   statusLabel : name of the state (default the color's meaning, such as 'Active' for green)
// }
// Returns { element, getValue, setValue, destroy }. getValue returns the options as drawn, and setValue takes the same shape.
export function createAvatar(options) {
    var built = buildAvatar(options || {});
    return {
        element: built.root,
        getValue: function () { return Object.assign({}, built.get()); },
        setValue: function (next) { built.redraw(next || {}); },
        destroy: function () { if (built.root.parentNode) built.root.parentNode.removeChild(built.root); }
    };
}

// createUserChip
// A pill with an avatar, a name, and an optional second line, for showing who owns or did something.
//
// Param: options | the createAvatar options, and { text: second line under the name [optional] }
// Returns { element, getValue, setValue, destroy }. getValue returns the options as drawn, with text, and setValue takes the same shape.
export function createUserChip(options) {
    options = options || {};
    var root = make('span', 'jpk-user-chip');
    var built = buildAvatar(options, true);
    var body = make('span', 'jpk-user-chip-body');
    var nameEl = make('span', 'jpk-user-chip-name');
    var textEl = make('span', 'jpk-user-chip-text');
    body.appendChild(nameEl);
    body.appendChild(textEl);
    root.appendChild(built.root);
    root.appendChild(body);
    var text = '';

    function setValue(next) {
        next = next || {};
        built.redraw(next);
        built.root.removeAttribute('title');
        text = next.text || '';
        nameEl.textContent = next.name || '';
        textEl.textContent = text;
        textEl.hidden = !text;
    }

    setValue(options);
    return {
        element: root,
        getValue: function () { return Object.assign({ text: text }, built.get()); },
        setValue: setValue,
        destroy: function () { if (root.parentNode) root.parentNode.removeChild(root); }
    };
}
