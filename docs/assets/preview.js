// Sizes every live preview frame on a docs page and gives it the docs theme.
//
// A frame is <iframe class="jpk-preview" src="../../../assets/previews/<name>.html" title="..."></iframe>.
// The preview page posts its content height, and this script sets it on the frame that sent it. It also
// sends the docs color scheme to each frame when the frame is ready and when the reader switches schemes.
(function () {
    'use strict';

    function frames() {
        return Array.prototype.slice.call(document.querySelectorAll('iframe.jpk-preview'));
    }

    function frameOf(source) {
        return frames().filter(function (f) { return f.contentWindow === source; })[0];
    }

    function scheme() {
        return document.body.getAttribute('data-md-color-scheme') === 'slate' ? 'dark' : 'light';
    }

    function sendTheme(frame) {
        if (frame && frame.contentWindow) {
            frame.contentWindow.postMessage({ type: 'jpk-preview-theme', theme: scheme() }, location.origin);
        }
    }

    window.addEventListener('message', function (e) {
        if (e.origin !== location.origin || !e.data) { return; }
        var frame = frameOf(e.source);
        if (!frame) { return; }
        if (e.data.type === 'jpk-preview-height' && e.data.height > 0) {
            frame.style.height = Math.ceil(e.data.height) + 'px';
        } else if (e.data.type === 'jpk-preview-ready') {
            sendTheme(frame);
        }
    });

    new MutationObserver(function () { frames().forEach(sendTheme); })
        .observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
})();
