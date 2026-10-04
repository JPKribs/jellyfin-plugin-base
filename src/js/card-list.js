// createSortableCardList
// Renders records as cards in priority order: a numbered head per record with a status dot, badges, up and
// down arrows, and drag to reorder, plus a body the open card shows. One editor element can be handed in and
// it moves into whichever card is open, parking in a holder while the list re-renders, so its fields and
// bindings survive. The caller owns the data and renders a card's text; this owns the mechanics.
//
// Param: listEl  | container element the cards render into
// Param: options | {
//   items        : array of records, in priority order (replace with setItems)
//   render       : function(item, index) -> { title, subtitle, badges: [{ label, cls }], dot: 'ok'|'bad'|'checking'|'unknown'|'none', disabled } [required]
//   editor       : element placed inside the open card's body [optional]
//   onSelect     : function(index) called when a card opens, before the editor is placed [optional]
//   onBeforeLeave: function(index) called when the open card is left, to read the editor back [optional]
//   onMove       : function(fromIndex, toIndex) called after a reorder; the caller saves [optional]
//   reorder      : allow arrows and drag (default true)
//   collapsible  : clicking the open head folds it and a chevron shows the state (default true); false keeps the open card open
//   escapeHtml   : function(str) -> safe string (default a built in escaper)
// }
// Returns { render, setItems, getSelected, setSelected, destroy }.
export function createSortableCardList(listEl, options) {
    options = options || {};
    if (!listEl) throw new Error('createSortableCardList needs a list element');
    if (typeof options.render !== 'function') throw new Error('createSortableCardList needs a render function');

    var items = options.items || [];
    var selected = -1;
    var collapsed = false;
    var dragIndex = -1;
    var reorder = options.reorder !== false;
    var collapsible = options.collapsible !== false;
    var esc = options.escapeHtml || function (str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    // The editor parks here while the list re-renders, since innerHTML would destroy it.
    var holder = null;
    if (options.editor) {
        holder = document.createElement('div');
        holder.className = 'hidden';
        listEl.parentNode.insertBefore(holder, listEl.nextSibling);
    }

    function parkEditor() {
        if (options.editor && options.editor.parentNode !== holder) holder.appendChild(options.editor);
    }

    function placeEditor() {
        if (!options.editor) return;
        var body = listEl.querySelector('.jpk-card-item.selected > .jpk-card-item-body');
        if (body) body.appendChild(options.editor);
        else parkEditor();
    }

    function render() {
        parkEditor();
        listEl.innerHTML = '';
        listEl.classList.add('jpk-card-list');
        items.forEach(function (item, index) {
            var spec = options.render(item, index) || {};
            var isSelected = index === selected;
            var card = document.createElement('div');
            card.className = 'jpk-card-item' + (isSelected ? ' selected' : '') + (isSelected && collapsed ? ' collapsed' : '') + (spec.disabled ? ' disabled' : '');
            card.setAttribute('data-index', String(index));
            var dot = spec.dot || 'none';
            var badges = (spec.badges || []).map(function (b) {
                return '<span class="jpk-badge ' + esc(b.cls || 'gray') + '">' + esc(b.label) + '</span>';
            }).join('');
            card.innerHTML =
                '<div class="jpk-card-item-head"' + (reorder ? ' draggable="true"' : '') + ' role="button" tabindex="0" aria-expanded="' + (isSelected && !collapsed ? 'true' : 'false') + '">' +
                    (reorder ? '<span class="jpk-card-item-grip material-icons" title="Drag to reorder">drag_indicator</span>' : '') +
                    '<span class="jpk-card-item-num">' + (index + 1) + '</span>' +
                    '<div class="jpk-card-item-main">' +
                        '<div class="jpk-card-item-title">' +
                            (dot !== 'none' ? '<span class="jpk-card-item-dot ' + esc(dot) + '"' + (spec.dotTitle ? ' title="' + esc(spec.dotTitle) + '"' : '') + '></span>' : '') +
                            '<span>' + esc(spec.title) + '</span>' + badges +
                        '</div>' +
                        (spec.subtitle ? '<div class="jpk-card-item-sub">' + esc(spec.subtitle) + '</div>' : '') +
                    '</div>' +
                    (reorder ? '<div class="jpk-card-item-arrows">' +
                        '<button type="button" class="jpk-row-btn" data-move="-1" title="Move up"' + (index === 0 ? ' disabled' : '') + '><span class="material-icons">keyboard_arrow_up</span></button>' +
                        '<button type="button" class="jpk-row-btn" data-move="1" title="Move down"' + (index === items.length - 1 ? ' disabled' : '') + '><span class="material-icons">keyboard_arrow_down</span></button>' +
                    '</div>' : '') +
                    (collapsible ? '<span class="jpk-card-item-chevron material-icons" aria-hidden="true">expand_more</span>' : '') +
                '</div>' +
                '<div class="jpk-card-item-body"></div>';
            listEl.appendChild(card);
        });
        placeEditor();
    }

    function open(index) {
        if (index === selected) {
            if (collapsible) {
                collapsed = !collapsed;
                render();
            }
            return;
        }
        if (selected >= 0 && options.onBeforeLeave) options.onBeforeLeave(selected);
        selected = index;
        collapsed = false;
        if (options.onSelect) options.onSelect(index);
        render();
    }

    function move(from, to) {
        if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return;
        if (selected >= 0 && options.onBeforeLeave) options.onBeforeLeave(selected);
        var moved = items.splice(from, 1)[0];
        items.splice(to, 0, moved);
        if (selected === from) selected = to;
        else if (from < selected && to >= selected) selected -= 1;
        else if (from > selected && to <= selected) selected += 1;
        render();
        if (options.onMove) options.onMove(from, to);
    }

    function onClick(e) {
        var head = e.target.closest('.jpk-card-item-head');
        if (!head || !listEl.contains(head)) return;
        var index = parseInt(head.parentNode.getAttribute('data-index'), 10);
        var moveBtn = e.target.closest('[data-move]');
        if (moveBtn) {
            if (!moveBtn.disabled) move(index, index + parseInt(moveBtn.getAttribute('data-move'), 10));
            return;
        }
        open(index);
    }

    function onKey(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var head = e.target.closest('.jpk-card-item-head');
        if (!head || e.target !== head) return;
        e.preventDefault();
        open(parseInt(head.parentNode.getAttribute('data-index'), 10));
    }

    function clearDropMarks() {
        listEl.querySelectorAll('.jpk-card-item').forEach(function (c) { c.classList.remove('drop-before', 'drop-after'); });
    }

    function onDragStart(e) {
        var head = e.target.closest('.jpk-card-item-head');
        if (!head) return;
        var card = head.parentNode;
        dragIndex = parseInt(card.getAttribute('data-index'), 10);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(dragIndex)); } catch (err) { /* older WebKit */ }
    }

    function onDragOver(e) {
        var card = e.target.closest('.jpk-card-item');
        if (!card || dragIndex < 0) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var rect = card.getBoundingClientRect();
        clearDropMarks();
        card.classList.add((e.clientY - rect.top) > rect.height / 2 ? 'drop-after' : 'drop-before');
    }

    function onDrop(e) {
        var card = e.target.closest('.jpk-card-item');
        if (!card || dragIndex < 0) return;
        e.preventDefault();
        var target = parseInt(card.getAttribute('data-index'), 10);
        if (card.classList.contains('drop-after')) target += 1;
        if (target > dragIndex) target -= 1;
        var from = dragIndex;
        dragIndex = -1;
        move(from, target);
    }

    function onDragEnd() {
        dragIndex = -1;
        clearDropMarks();
        listEl.querySelectorAll('.jpk-card-item.dragging').forEach(function (c) { c.classList.remove('dragging'); });
    }

    listEl.addEventListener('click', onClick);
    listEl.addEventListener('keydown', onKey);
    if (reorder) {
        listEl.addEventListener('dragstart', onDragStart);
        listEl.addEventListener('dragover', onDragOver);
        listEl.addEventListener('drop', onDrop);
        listEl.addEventListener('dragend', onDragEnd);
    }

    return {
        render: render,
        setItems: function (next) { items = next || []; if (selected >= items.length) selected = items.length - 1; render(); },
        getSelected: function () { return selected; },
        setSelected: function (index, opts) {
            selected = typeof index === 'number' && index >= 0 && index < items.length ? index : -1;
            collapsed = !!(opts && opts.collapsed);
            if (selected >= 0 && options.onSelect) options.onSelect(selected);
            render();
        },
        destroy: function () {
            listEl.removeEventListener('click', onClick);
            listEl.removeEventListener('keydown', onKey);
            listEl.removeEventListener('dragstart', onDragStart);
            listEl.removeEventListener('dragover', onDragOver);
            listEl.removeEventListener('drop', onDrop);
            listEl.removeEventListener('dragend', onDragEnd);
            parkEditor();
        }
    };
}
