// A small stand-in for the browser DOM, enough for the kit's dialog and table code to run under node's own test runner
// without a dependency. It supports the selectors the kit uses (tag, .class, #id, [attr], [attr="v"], [attr^="v"],
// :not(...) of one of those, comma lists, and a descendant or child step) and treats an element as visible unless it or
// an ancestor has display:none or the hidden attribute, or it is not in the document. Where the browser differs from a plain
// array or object, the stub follows the browser. querySelectorAll returns a NodeList, with no filter or map. A disabled control
// takes no click. focus() moves document.activeElement and fires blur, focusout, focus, and focusin, and does nothing for an
// element that cannot take focus. Removing the focused element returns focus to the body. hidden and disabled reflect their
// attributes. textContent is the text of the element and its children. Events run the capture phase from the document down, then
// the target, then bubble up to the document, except focus, blur, mouseenter, mouseleave, and scroll, which do not bubble.

class FakeClassList {
    constructor(el) { this.el = el; }
    get _list() { return (this.el.className || '').split(/\s+/).filter(Boolean); }
    contains(c) { return this._list.indexOf(c) !== -1; }
    add(...cs) { var l = this._list; cs.forEach(function (c) { if (l.indexOf(c) === -1) l.push(c); }); this.el.className = l.join(' '); }
    remove(...cs) { this.el.className = this._list.filter(function (c) { return cs.indexOf(c) === -1; }).join(' '); }
    toggle(c, on) { if (on === undefined) on = !this.contains(c); if (on) this.add(c); else this.remove(c); }
}

export class FakeNode {}

// The result of querySelectorAll. Like the browser's NodeList it has a length, item, forEach, and the entries, keys, and
// values iterators, and none of the array methods, so code that calls filter or map on it fails here as it does there.
export class FakeNodeList {
    constructor(items) {
        var self = this;
        items.forEach(function (n, i) { self[i] = n; });
        Object.defineProperty(this, 'length', { value: items.length });
        Object.defineProperty(this, '_items', { value: items.slice() });
    }
    item(i) { return this._items[i] || null; }
    forEach(fn, thisArg) { this._items.forEach(function (n, i) { fn.call(thisArg, n, i, this); }, this); }
    entries() { return this._items.entries(); }
    keys() { return this._items.keys(); }
    values() { return this._items.values(); }
    [Symbol.iterator]() { return this._items.values(); }
}

// The window as an event target, which the document's events reach last, as in the browser.
var windowTarget = { listeners: {} };

var FOCUSABLE_TAGS = /^(BUTTON|INPUT|SELECT|TEXTAREA)$/;
var NO_BUBBLE = ['focus', 'blur', 'mouseenter', 'mouseleave', 'scroll'];

export class FakeElement extends FakeNode {
    constructor(doc, tagName) {
        super();
        this.ownerDocument = doc;
        this.tagName = tagName.toUpperCase();
        this.className = '';
        this.attributes = {};
        this.children = [];
        this.parentNode = null;
        // Custom properties are stored under their own name, as a browser reads them back.
        this.style = Object.defineProperties({}, {
            setProperty: { value: function (name, value) { this[name] = String(value); }, enumerable: false, writable: true, configurable: true },
            removeProperty: { value: function (name) { delete this[name]; }, enumerable: false, writable: true, configurable: true },
            getPropertyValue: { value: function (name) { return this[name] === undefined ? '' : this[name]; }, enumerable: false, writable: true, configurable: true }
        });
        this.listeners = {};
        this._text = '';
        this._value = undefined;
        this._selected = 0;
        this.checked = false;
        this.classList = new FakeClassList(this);
    }
    // data-* attributes, as the DOM's dataset reads and writes them.
    get dataset() {
        var el = this;
        var attr = function (k) { return 'data-' + String(k).replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); };
        return new Proxy({}, {
            get: function (_, k) { return el.attributes[attr(k)]; },
            set: function (_, k, v) { el.attributes[attr(k)] = String(v); return true; },
            deleteProperty: function (_, k) { delete el.attributes[attr(k)]; return true; }
        });
    }
    // A select reads its value from the chosen option, and an option reads its value attribute, else its text.
    get value() {
        if (this.tagName === 'SELECT') { var o = this.options[this._selected]; return o ? o.value : ''; }
        if (this.tagName === 'OPTION') return this._value !== undefined ? this._value : (this.attributes.value !== undefined ? this.attributes.value : this.textContent);
        return this._value !== undefined ? this._value : (this.attributes.value !== undefined ? this.attributes.value : '');
    }
    set value(v) {
        if (this.tagName === 'SELECT') {
            var at = -1;
            this.options.forEach(function (o, i) { if (at === -1 && o.value === String(v)) at = i; });
            this._selected = at;
        } else this._value = v === null || v === undefined ? '' : String(v);
    }
    get options() { return new FakeNodeList(this.children.filter(function (c) { return c.tagName === 'OPTION'; })); }
    get selectedIndex() { return this.options.length ? this._selected : -1; }
    set selectedIndex(i) { this._selected = i; }
    get hidden() { return 'hidden' in this.attributes; }
    set hidden(v) { if (v) this.attributes.hidden = ''; else delete this.attributes.hidden; }
    get disabled() { return 'disabled' in this.attributes; }
    set disabled(v) { if (v) this.attributes.disabled = ''; else delete this.attributes.disabled; }
    get textContent() { return this._text + this.children.map(function (c) { return c.textContent; }).join(''); }
    set textContent(v) {
        this._detachAll();
        this._text = v === null || v === undefined ? '' : String(v);
    }
    // Drops every child, and returns focus to the body when the focused element was inside.
    _detachAll() {
        var gone = this.children;
        this.children = [];
        var doc = this.ownerDocument;
        gone.forEach(function (c) {
            c.parentNode = null;
            if (doc.activeElement && c.contains(doc.activeElement)) doc.activeElement = doc.body;
        });
    }
    get id() { return this.attributes.id || ''; }
    set id(v) { this.attributes.id = v; }
    get title() { return this.attributes.title || ''; }
    set title(v) { this.attributes.title = String(v); }
    get nextSibling() {
        if (!this.parentNode) return null;
        var siblings = this.parentNode.children;
        return siblings[siblings.indexOf(this) + 1] || null;
    }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    getBoundingClientRect() { return this._rect || { top: 100, left: 100, right: 160, bottom: 120, width: 60, height: 20 }; }
    get type() { return this.attributes.type || (this.tagName === 'INPUT' ? 'text' : (this.tagName === 'BUTTON' ? 'submit' : undefined)); }
    set type(v) { this.attributes.type = v; }
    set innerHTML(html) { this._detachAll(); this._text = ''; this._html = html; }
    get innerHTML() { return this._html || ''; }
    get isConnected() {
        var n = this;
        while (n.parentNode) n = n.parentNode;
        return n === this.ownerDocument.documentElement;
    }
    setAttribute(k, v) { if (k === 'class') this.className = String(v); else this.attributes[k] = String(v); }
    getAttribute(k) { return k === 'class' ? this.className : (k in this.attributes ? this.attributes[k] : null); }
    hasAttribute(k) { return k === 'class' ? !!this.className : k in this.attributes; }
    removeAttribute(k) { delete this.attributes[k]; }
    appendChild(child) {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        return child;
    }
    insertBefore(child, ref) {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = this;
        var i = this.children.indexOf(ref);
        if (i === -1) this.children.push(child); else this.children.splice(i, 0, child);
        return child;
    }
    replaceChild(next, old) {
        this.insertBefore(next, old);
        this.removeChild(old);
        return old;
    }
    removeChild(child) {
        this.children = this.children.filter(function (c) { return c !== child; });
        child.parentNode = null;
        var doc = this.ownerDocument;
        if (doc.activeElement && child.contains(doc.activeElement)) doc.activeElement = doc.body;
        return child;
    }
    contains(other) {
        for (var n = other; n; n = n.parentNode) if (n === this) return true;
        return false;
    }
    addEventListener(type, fn, opts) { addListener(this, type, fn, opts); }
    removeEventListener(type, fn, opts) { removeListener(this, type, fn, opts); }
    // Runs the event through the capture phase from the document down, the target, and then the bubble phase back up, until stopPropagation.
    dispatch(type, init) {
        init = init || {};
        if (type === 'click' && this.disabled && FOCUSABLE_TAGS.test(this.tagName)) return { type: type, target: this, defaultPrevented: false };
        var e = Object.assign({ type: type, target: this, defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; this.immediate = true; } }, init);
        var bubbles = init.bubbles !== undefined ? init.bubbles : NO_BUBBLE.indexOf(type) === -1;
        var path = [];
        for (var n = this; n; n = n.parentNode) path.push(n);
        if (path[path.length - 1] === this.ownerDocument.documentElement) path.push(this.ownerDocument, windowTarget);
        deliver(e, path, bubbles);
        return e;
    }
    click() { if (!this.disabled) this.dispatch('click'); }
    // Delivers an Event object, as the browser's dispatchEvent does.
    dispatchEvent(event) { return !this.dispatch(event.type, { bubbles: event.bubbles }).defaultPrevented; }
    select() {}
    setSelectionRange() {}
    get _canFocus() {
        if (this.disabled || !this.isConnected || !this.getClientRects().length) return false;
        if (this.hasAttribute('tabindex') || this.getAttribute('contenteditable') === 'true') return true;
        if (this.tagName === 'A') return this.attributes.href !== undefined;
        if (this.tagName === 'INPUT' && this.type === 'hidden') return false;
        return FOCUSABLE_TAGS.test(this.tagName);
    }
    focus() {
        if (!this._canFocus) return;
        var doc = this.ownerDocument;
        var before = doc.activeElement;
        if (before === this) return;
        doc.activeElement = this;
        if (before && before.dispatch && before !== doc.body) {
            before.dispatch('blur', { relatedTarget: this });
            before.dispatch('focusout', { relatedTarget: this });
        }
        this.dispatch('focus', { relatedTarget: before });
        this.dispatch('focusin', { relatedTarget: before });
    }
    blur() {
        var doc = this.ownerDocument;
        if (doc.activeElement !== this) return;
        doc.activeElement = doc.body;
        this.dispatch('blur');
        this.dispatch('focusout');
    }
    getClientRects() {
        if (!this.isConnected) return [];
        for (var n = this; n && n.style; n = n.parentNode) if (n.style.display === 'none' || n.hidden) return [];
        return [{ width: 1, height: 1 }];
    }
    matches(selector) { return selector.split(',').some((part) => matchComplex(this, part.trim())); }
    closest(selector) {
        for (var n = this; n && n.matches; n = n.parentNode) if (n.matches(selector)) return n;
        return null;
    }
    querySelectorAll(selector) {
        var out = [];
        (function walk(el) {
            el.children.forEach(function (c) { if (c.matches(selector)) out.push(c); walk(c); });
        })(this);
        return new FakeNodeList(out);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}


// Listener lists keep the capture flag with each function, so the two phases stay apart.
function addListener(target, type, fn, opts) {
    var capture = opts === true || !!(opts && opts.capture);
    var list = (target.listeners[type] = target.listeners[type] || []);
    if (list.some(function (l) { return l.fn === fn && l.capture === capture; })) return;
    list.push({ fn: fn, capture: capture });
}

function removeListener(target, type, fn, opts) {
    var capture = opts === true || !!(opts && opts.capture);
    target.listeners[type] = (target.listeners[type] || []).filter(function (l) { return !(l.fn === fn && l.capture === capture); });
}

// Runs one node's listeners of a phase, on a copy so a listener may add or remove others.
function invoke(node, e, phase) {
    e.currentTarget = node;
    (node.listeners[e.type] || []).slice().forEach(function (l) {
        if (e.immediate) return;
        if (phase === 'capture' && !l.capture) return;
        if (phase === 'bubble' && l.capture) return;
        l.fn(e);
    });
}

// path runs from the target up to the document. Capture goes down it, then the target, then bubbling goes back up.
function deliver(e, path, bubbles) {
    for (var i = path.length - 1; i > 0 && !e.stopped; i--) invoke(path[i], e, 'capture');
    if (!e.stopped) { invoke(path[0], e, 'capture'); }
    if (!e.stopped) { invoke(path[0], e, 'bubble'); }
    for (var j = 1; bubbles && j < path.length && !e.stopped; j++) invoke(path[j], e, 'bubble');
}

// One compound selector, such as button:not([disabled]) or .a.b[x="1"].
function matchCompound(el, compound) {
    var rest = compound;
    var not = null;
    var m = rest.match(/:not\((.*)\)$/);
    if (m) { not = m[1]; rest = rest.slice(0, m.index); }
    if (not && matchCompound(el, not)) return false;
    var child = rest.match(/:(first|last)-child$/);
    if (child) {
        var siblings = el.parentNode ? el.parentNode.children : [el];
        if (siblings[child[1] === 'first' ? 0 : siblings.length - 1] !== el) return false;
        rest = rest.slice(0, child.index);
    }
    if (/:checked$/.test(rest)) {
        if (!el.checked) return false;
        rest = rest.replace(/:checked$/, '');
    }
    var re = /([a-zA-Z][\w-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:([\^*]?=)"([^"]*)")?\]/g;
    var tok;
    while ((tok = re.exec(rest))) {
        if (tok[1] && el.tagName !== tok[1].toUpperCase()) return false;
        if (tok[2] && !el.classList.contains(tok[2])) return false;
        if (tok[3] && el.id !== tok[3]) return false;
        if (tok[4]) {
            var name = tok[4];
            var has = name === 'hidden' ? el.hidden || el.hasAttribute('hidden') : (name === 'disabled' ? el.disabled : el.hasAttribute(name));
            if (name === 'href' && el.attributes.href !== undefined) has = true;
            if (!has) return false;
            if (tok[5]) {
                var v = String(el.getAttribute(name));
                if (tok[5] === '=' && v !== tok[6]) return false;
                if (tok[5] === '^=' && v.indexOf(tok[6]) !== 0) return false;
                if (tok[5] === '*=' && v.indexOf(tok[6]) === -1) return false;
            }
        }
    }
    return true;
}

// A complex selector of compounds joined by descendant (space) or child (>) steps.
function matchComplex(el, selector) {
    var parts = selector.replace(/\s*>\s*/g, ' > ').split(/\s+/);
    function match(node, i) {
        if (!node || !node.tagName) return false;
        if (!matchCompound(node, parts[i])) return false;
        if (i === 0) return true;
        if (parts[i - 1] === '>') return match(node.parentNode, i - 2);
        for (var p = node.parentNode; p && p.tagName; p = p.parentNode) if (match(p, i - 1)) return true;
        return false;
    }
    return match(el, parts.length - 1);
}

// Copies a NodeList, or any array-like, into an array, for a test that wants filter or map.
export function all(root, selector) {
    return Array.prototype.slice.call(selector === undefined ? root : root.querySelectorAll(selector));
}

// Tells whether a field message shows its text. The message element itself stays in the page as a live region.
export function shown(message) {
    return !message.querySelector('.base-field-message-text').hidden;
}

export function installFakeDom(opts) {
    opts = opts || {};
    var doc = {
        listeners: {},
        activeElement: null,
        createElement(tag) { return new FakeElement(doc, tag); },
        createElementNS(ns, tag) { return new FakeElement(doc, tag); },
        // Delivers an event to the document's listeners only, with the given target, as one that reached the document.
        dispatch(type, init) {
            var e = Object.assign({ type: type, target: doc.body, defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; this.immediate = true; } }, init || {});
            deliver(e, [doc, windowTarget], NO_BUBBLE.indexOf(type) === -1);
            return e;
        },
        addEventListener(type, fn, opts) { addListener(doc, type, fn, opts); },
        removeEventListener(type, fn, opts) { removeListener(doc, type, fn, opts); },
        querySelector(sel) { return doc.documentElement.querySelector(sel); },
        querySelectorAll(sel) { return doc.documentElement.querySelectorAll(sel); },
        // Presses a key on the focused element, so it runs the capture phase from the document, the target, and the bubble phase.
        key(key, extra) {
            return (doc.activeElement || doc.body).dispatch('keydown', Object.assign({ key: key }, extra || {}));
        }
    };
    doc.documentElement = new FakeElement(doc, 'html');
    doc.body = doc.documentElement.appendChild(new FakeElement(doc, 'body'));
    doc.activeElement = doc.body;
    globalThis.document = doc;
    globalThis.Node = FakeNode;
    globalThis.window = globalThis;
    windowTarget.listeners = {};
    globalThis.addEventListener = function (type, fn, opts) { addListener(windowTarget, type, fn, opts); };
    globalThis.removeEventListener = function (type, fn, opts) { removeListener(windowTarget, type, fn, opts); };
    globalThis.innerWidth = 1024;
    globalThis.innerHeight = 768;
    var coarse = !!opts.coarse;
    globalThis.matchMedia = function (q) { return { matches: q === '(pointer: coarse)' ? coarse : false }; };
    return {
        document: doc,
        // Delivers an event to the window's listeners, such as a resize.
        dispatchWindow(type, init) {
            var e = Object.assign({ type: type, target: globalThis, defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } }, init || {});
            deliver(e, [windowTarget], false);
            return e;
        },
        // How many listeners of a type the window holds.
        windowListeners(type) { return (windowTarget.listeners[type] || []).length; },
        setCoarse(v) { coarse = !!v; },
        el(tag, props, children) {
            var e = new FakeElement(doc, tag);
            Object.keys(props || {}).forEach(function (k) {
                if (k === 'class') e.className = props[k];
                else if (k === 'style') Object.assign(e.style, props[k]);
                else if (k === 'hidden' || k === 'disabled') e[k] = !!props[k];
                else e.setAttribute(k, props[k]);
            });
            (children || []).forEach(function (c) { e.appendChild(c); });
            return e;
        }
    };
}
