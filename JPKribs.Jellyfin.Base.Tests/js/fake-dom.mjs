// A small stand-in for the browser DOM, enough for the kit's dialog and table code to run under node's own test runner
// without a dependency. It supports the selectors the kit uses (tag, .class, #id, [attr], [attr="v"], [attr^="v"],
// :not(...) of one of those, comma lists, and a descendant or child step) and treats an element as visible unless it or
// an ancestor has display:none or it isn't in the document.

class FakeClassList {
    constructor(el) { this.el = el; }
    get _list() { return (this.el.className || '').split(/\s+/).filter(Boolean); }
    contains(c) { return this._list.indexOf(c) !== -1; }
    add(...cs) { var l = this._list; cs.forEach(function (c) { if (l.indexOf(c) === -1) l.push(c); }); this.el.className = l.join(' '); }
    remove(...cs) { this.el.className = this._list.filter(function (c) { return cs.indexOf(c) === -1; }).join(' '); }
    toggle(c, on) { if (on === undefined) on = !this.contains(c); if (on) this.add(c); else this.remove(c); }
}

export class FakeNode {}

export class FakeElement extends FakeNode {
    constructor(doc, tagName) {
        super();
        this.ownerDocument = doc;
        this.tagName = tagName.toUpperCase();
        this.className = '';
        this.attributes = {};
        this.children = [];
        this.parentNode = null;
        this.style = {};
        this.listeners = {};
        this.textContent = '';
        this.disabled = false;
        this.hidden = false;
        this.value = '';
        this.classList = new FakeClassList(this);
    }
    get id() { return this.attributes.id || ''; }
    set id(v) { this.attributes.id = v; }
    get type() { return this.attributes.type || (this.tagName === 'INPUT' ? 'text' : (this.tagName === 'BUTTON' ? 'submit' : undefined)); }
    set type(v) { this.attributes.type = v; }
    set innerHTML(html) { this.children = []; this._html = html; }
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
    removeChild(child) {
        this.children = this.children.filter(function (c) { return c !== child; });
        child.parentNode = null;
        return child;
    }
    contains(other) {
        for (var n = other; n; n = n.parentNode) if (n === this) return true;
        return false;
    }
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(function (f) { return f !== fn; }); }
    dispatch(type, init) {
        var e = Object.assign({ type: type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} }, init || {});
        (this.listeners[type] || []).slice().forEach(function (fn) { fn(e); });
        return e;
    }
    click() { this.dispatch('click'); }
    focus() { if (this.isConnected) this.ownerDocument.activeElement = this; }
    getClientRects() {
        if (!this.isConnected) return [];
        for (var n = this; n && n.style; n = n.parentNode) if (n.style.display === 'none') return [];
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
        return out;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

// One compound selector, such as button:not([disabled]) or .a.b[x="1"].
function matchCompound(el, compound) {
    var rest = compound;
    var not = null;
    var m = rest.match(/:not\((.*)\)$/);
    if (m) { not = m[1]; rest = rest.slice(0, m.index); }
    if (not && matchCompound(el, not)) return false;
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

export function installFakeDom(opts) {
    opts = opts || {};
    var doc = {
        listeners: {},
        activeElement: null,
        createElement(tag) { return new FakeElement(doc, tag); },
        addEventListener(type, fn) { (doc.listeners[type] = doc.listeners[type] || []).push(fn); },
        removeEventListener(type, fn) { doc.listeners[type] = (doc.listeners[type] || []).filter(function (f) { return f !== fn; }); },
        querySelector(sel) { return doc.documentElement.querySelector(sel); },
        querySelectorAll(sel) { return doc.documentElement.querySelectorAll(sel); },
        // Delivers a key press to the document's listeners, as the dialogs listen there.
        key(key, extra) {
            var e = Object.assign({ key: key, target: doc.activeElement, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} }, extra || {});
            (doc.listeners.keydown || []).slice().forEach(function (fn) { fn(e); });
            return e;
        }
    };
    doc.documentElement = new FakeElement(doc, 'html');
    doc.body = doc.documentElement.appendChild(new FakeElement(doc, 'body'));
    doc.activeElement = doc.body;
    globalThis.document = doc;
    globalThis.Node = FakeNode;
    globalThis.window = globalThis;
    var coarse = !!opts.coarse;
    globalThis.matchMedia = function (q) { return { matches: q === '(pointer: coarse)' ? coarse : false }; };
    return {
        document: doc,
        setCoarse(v) { coarse = !!v; },
        el(tag, props, children) {
            var e = new FakeElement(doc, tag);
            Object.keys(props || {}).forEach(function (k) {
                if (k === 'class') e.className = props[k];
                else if (k === 'style') Object.assign(e.style, props[k]);
                else if (k === 'hidden' || k === 'disabled') e[k] = props[k];
                else e.setAttribute(k, props[k]);
            });
            (children || []).forEach(function (c) { e.appendChild(c); });
            return e;
        }
    };
}
