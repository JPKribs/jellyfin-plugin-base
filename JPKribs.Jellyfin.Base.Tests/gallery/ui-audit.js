// Scans the gallery for layout problems and returns them as [section, problem, detail] rows: the page scrolling sideways,
// a control outside its section, two controls overlapping, controls on one line with different heights, controls
// touching, and text cut off without an ellipsis. It scans each framed preview too. Paste it into the console of the
// gallery, or fetch and eval it, at desktop, tablet, and phone width. A clean gallery returns an empty list.
(function () {
    function visible(el) {
        if (!el.getClientRects().length) return false;
        var s = getComputedStyle(el);
        return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity) > 0.05;
    }
    function name(el) {
        var c = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '';
        return el.tagName.toLowerCase() + (c ? '.' + String(c).trim().split(/\s+/).slice(0, 3).join('.') : '') + (el.textContent ? ' "' + el.textContent.trim().slice(0, 24) + '"' : '');
    }
    function scan(doc, label, out) {
        var vw = doc.documentElement.clientWidth;
        if (doc.documentElement.scrollWidth > vw + 1) out.push([label, 'page scrolls sideways', doc.documentElement.scrollWidth + ' > ' + vw]);
        var sections = doc.querySelectorAll('section, .g-section');
        var roots = sections.length ? Array.prototype.slice.call(sections) : [doc.body];
        roots.forEach(function (sec) {
            var title = (sec.querySelector('h2, h3, .g-title') || {}).textContent || label;
            var box = sec.getBoundingClientRect();
            var controls = sec.querySelectorAll('button, input:not([type=hidden]), select, textarea, .base-badge, .base-pill, .base-tag, .base-card, .base-row-btn, a, [role=button]');
            var list = Array.prototype.filter.call(controls, visible);
            list.forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (r.width < 1 || r.height < 1) return;
                if (el.closest('svg')) return;
                if (r.right > box.right + 1 || r.left < box.left - 1) {
                    var clip = el.closest('[style*="overflow"], .base-data-grid, .base-list, .base-subtabs, .base-static-table-scroll, .base-log, .scrolls');
                    if (!clip) out.push([title, 'outside its section', name(el)]);
                }
            });
            // Pairs of controls that overlap each other.
            for (var i = 0; i < list.length; i++) {
                var a = list[i].getBoundingClientRect();
                for (var j = i + 1; j < list.length; j++) {
                    var b = list[j];
                    if (list[i].contains(b) || b.contains(list[i])) continue;
                    // Controls drawn inside a field's own box, and map shapes that border each other, overlap by design.
                    if (b.closest('.base-adorned, .base-color-picker-box') && list[i].closest('.base-adorned, .base-color-picker-box') === b.closest('.base-adorned, .base-color-picker-box')) continue;
                    if (b.closest('svg') || list[i].closest('svg')) continue;
                    var c = b.getBoundingClientRect();
                    var w = Math.min(a.right, c.right) - Math.max(a.left, c.left);
                    var h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
                    if (w > 2 && h > 2) out.push([title, 'overlap', name(list[i]) + ' / ' + name(b)]);
                }
            }
            // Controls side by side on one line with different heights, or touching.
            var groups = new Map();
            list.forEach(function (el) {
                if (!/^(BUTTON|INPUT|SELECT)$/.test(el.tagName)) return;
                if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'range' || el.type === 'color') return;
                if (el.closest('.base-adorned-steps, .base-row-arrows') || el.classList.contains('base-row-btn') || el.classList.contains('base-adorned-step') || el.classList.contains('base-adorned-eye')) return;
                var p = el.parentElement;
                while (p && p !== sec && !/(flex|grid)/.test(getComputedStyle(p).display)) p = p.parentElement;
                if (!p) return;
                if (!groups.has(p)) groups.set(p, []);
                groups.get(p).push(el);
            });
            groups.forEach(function (els) {
                for (var k = 0; k < els.length; k++) {
                    for (var m = k + 1; m < els.length; m++) {
                        var x = els[k].getBoundingClientRect(), y = els[m].getBoundingClientRect();
                        var sameLine = Math.abs((x.top + x.bottom) / 2 - (y.top + y.bottom) / 2) < Math.min(x.height, y.height) / 2;
                        if (!sameLine) continue;
                        if (Math.abs(x.height - y.height) > 1.5 && !els[k].classList.contains('base-pill') && !els[m].classList.contains('base-pill')) out.push([title, 'uneven heights on one line', name(els[k]) + ' ' + Math.round(x.height) + ' / ' + name(els[m]) + ' ' + Math.round(y.height)]);
                        var gap = Math.max(y.left - x.right, x.left - y.right);
                        if (gap >= 0 && gap < 4) out.push([title, 'touching', name(els[k]) + ' / ' + name(els[m]) + ' gap ' + Math.round(gap)]);
                    }
                }
            });
            // Text clipped without an ellipsis.
            Array.prototype.forEach.call(sec.querySelectorAll('*'), function (el) {
                if (!visible(el) || el.children.length || el.closest('.base-sr-only')) return;
                var s = getComputedStyle(el);
                if (el.scrollWidth > el.clientWidth + 1 && s.overflow === 'hidden' && s.textOverflow !== 'ellipsis' && el.clientWidth > 0 && !el.closest('svg')) out.push([title, 'text cut off', name(el)]);
            });
        });
    }
    var out = [];
    scan(document, 'gallery', out);
    Array.prototype.forEach.call(document.querySelectorAll('iframe.g-preview'), function (f) {
        try { scan(f.contentDocument, f.title, out); } catch (e) { out.push([f.title, 'frame', String(e)]); }
    });
    var seen = {};
    return out.filter(function (o) { var k = o.join('|'); if (seen[k]) return false; seen[k] = 1; return true; });
})();
