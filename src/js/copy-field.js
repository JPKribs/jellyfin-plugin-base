import { make, iconButton, nextId, listen, runAll } from './dom-util.js';
import { copyToClipboard } from './clipboard.js';

// createCopyField
// A read-only value with a copy button that shows its result. A secret value is masked until the reveal button is pressed.
//
// Param: options | {
//   value        : the text to show and copy [optional]
//   secret       : true masks the value and adds a reveal button (default false)
//   mono         : true shows the value in the mono font (default true)
//   label        : aria-label of the value (default 'Value')
//   copyLabel    : title and aria-label of the copy button (default 'Copy')
//   copiedText   : feedback after a copy (default 'Copied.')
//   failedText   : feedback when the copy failed (default 'Copy failed.')
//   revealLabel  : title of the reveal button while masked (default 'Show')
//   hideLabel    : title of the reveal button while shown (default 'Hide')
//   feedbackMs   : how long the feedback stays (default 1500)
//   onCopy       : function(value, ok) called after each copy [optional]
// }
// Returns { element, input, getValue, setValue, copy, destroy }. copy() returns a promise of whether the copy worked.
export function createCopyField(options) {
    options = options || {};
    var cleanups = [];
    var timer = null;
    var copyLabel = options.copyLabel || 'Copy';

    var root = make('div', 'jpk-copy-field');
    var input = make('input', options.mono === false ? '' : 'jpk-mono', { type: options.secret ? 'password' : 'text', 'aria-label': options.label || 'Value', autocomplete: 'off' });
    input.setAttribute('readonly', '');
    input.value = options.value === undefined || options.value === null ? '' : String(options.value);
    var button = iconButton('jpk-row-btn jpk-copy-button', 'content_copy', copyLabel);
    var status = make('span', 'jpk-sr-only', { role: 'status' });
    status.id = nextId('copy');
    root.appendChild(input);
    var reveal = null;
    if (options.secret) {
        reveal = iconButton('jpk-row-btn jpk-copy-reveal', 'visibility', options.revealLabel || 'Show');
        reveal.setAttribute('aria-pressed', 'false');
        root.appendChild(reveal);
        cleanups.push(listen(reveal, 'click', function () {
            var shown = input.type === 'text';
            input.type = shown ? 'password' : 'text';
            var title = shown ? (options.revealLabel || 'Show') : (options.hideLabel || 'Hide');
            reveal.title = title;
            reveal.setAttribute('aria-label', title);
            reveal.setAttribute('aria-pressed', shown ? 'false' : 'true');
            reveal.children[0].textContent = shown ? 'visibility' : 'visibility_off';
        }));
    }
    root.appendChild(button);
    root.appendChild(status);

    function copy() {
        var value = input.value;
        return copyToClipboard(value).then(function (ok) {
            var text = ok ? (options.copiedText || 'Copied.') : (options.failedText || 'Copy failed.');
            status.textContent = text;
            button.classList.toggle('success', ok);
            button.title = text;
            button.children[0].textContent = ok ? 'check' : 'error_outline';
            clearTimeout(timer);
            timer = setTimeout(function () {
                button.classList.remove('success');
                button.title = copyLabel;
                button.children[0].textContent = 'content_copy';
                status.textContent = '';
            }, options.feedbackMs || 1500);
            if (options.onCopy) options.onCopy(value, ok);
            return ok;
        });
    }

    cleanups.push(listen(button, 'click', copy));

    return {
        element: root,
        input: input,
        getValue: function () { return input.value; },
        setValue: function (value) { input.value = value === undefined || value === null ? '' : String(value); },
        copy: copy,
        destroy: function () { clearTimeout(timer); runAll(cleanups); }
    };
}
