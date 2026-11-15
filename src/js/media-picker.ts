import { make, fill, nextId, addToken, claimEscape, has, applyFieldSize } from './lib/dom.js';
import { createTypeahead } from './lib/typeahead.js';
import { focusAfterRemove } from './lib/chips.js';
import { hasPrimaryImage } from './lib/thumb.js';
import { createSearchField } from './search-field.js';
import { createMediaCard, mediaShape } from './media-card.js';
import type { MediaCardHandle } from './media-card.js';
import { createList } from './list.js';
import type { ListHeight } from './list.js';
import type { ComponentHandle } from './types.js';

/** A library item in a media picker, as the Items endpoint returns it. ImageTags, when given, tells whether a Primary image exists. */
export interface MediaPickerItem {
    Id: string;
    Name: string;
    Type: string;
    ProductionYear?: number | null;
    ImageTags?: Record<string, string> | null;
}

/** What createMediaPicker takes. searchFn answers a query with a promise of items and replaces the Items endpoint. */
export interface MediaPickerOptions {
    value?: MediaPickerItem[] | null;
    itemTypes?: string[];
    single?: boolean;
    maxResults?: number;
    minChars?: number;
    delay?: number;
    label?: string;
    description?: string;
    placeholder?: string;
    clearLabel?: string;
    emptyText?: string;
    noResultsText?: string;
    errorText?: string;
    removeText?: string;
    typeLabels?: Record<string, string>;
    height?: ListHeight;
    maxHeight?: number | string | null;
    minHeight?: number | string | null;
    size?: 'small' | 'medium' | 'large';
    searchFn?(query: string): Promise<MediaPickerItem[] | null | undefined>;
    onChange?(items: MediaPickerItem[]): void;
}

/** What createMediaPicker returns. setValue does not call onChange. */
export interface MediaPickerHandle extends ComponentHandle {
    input: HTMLInputElement;
    getValue(): MediaPickerItem[];
    setValue(items: MediaPickerItem[] | null): void;
    setHeight(height: ListHeight, maxHeight?: number | string | null): void;
    setSize(size?: 'small' | 'medium' | 'large'): void;
    destroy(): void;
}

var TYPE_LABELS: Record<string, string> = {
    Movie: 'Movie', Series: 'Series', Season: 'Season', Episode: 'Episode', BoxSet: 'Collection', MusicAlbum: 'Album',
    MusicArtist: 'Artist', Audio: 'Song', MusicVideo: 'Music Video', Video: 'Video', Playlist: 'Playlist', Person: 'Person',
    Book: 'Book', TvChannel: 'Channel', Program: 'Program', Trailer: 'Trailer'
};

// Asks the Items endpoint through ApiClient, or answers with nothing when the page has no ApiClient.
function searchLibrary(query: string, itemTypes: string[], limit: number): Promise<MediaPickerItem[]> {
    if (typeof ApiClient === 'undefined' || !ApiClient) return Promise.resolve([]);
    var url = ApiClient.getUrl('Items', {
        searchTerm: query,
        IncludeItemTypes: itemTypes.join(','),
        Recursive: true,
        Limit: limit,
        Fields: 'ProductionYear,PrimaryImageAspectRatio',
        EnableImageTypes: 'Primary'
    });
    return ApiClient.getJSON(url).then(function (data: { Items?: MediaPickerItem[] } | null) {
        return (data && data.Items) || [];
    });
}

// Keeps the fields a picker stores from one item.
function normalize(item: MediaPickerItem): MediaPickerItem {
    var out: MediaPickerItem = { Id: String(item.Id), Name: item.Name == null ? '' : String(item.Name), Type: item.Type == null ? '' : String(item.Type) };
    if (item.ProductionYear != null) out.ProductionYear = item.ProductionYear;
    if (item.ImageTags) out.ImageTags = item.ImageTags;
    return out;
}

/**
 * A library search that picks media items. Each result and each picked item shows as a media card with its artwork, and each picked item has a Remove button.
 *
 * @param options {
 *   value         : picked items, as [{ Id, Name, Type, ProductionYear }] [optional]
 *   itemTypes     : item types to search (default ['Movie', 'Series'])
 *   single        : keep at most one item, replacing it on the next pick (default false)
 *   maxResults    : most results shown (default 20)
 *   minChars      : fewest typed characters that start a search (default 2)
 *   delay         : milliseconds to wait after typing before the search runs (default 250)
 *   label         : the field label, which also names the input [optional]
 *   description   : a sentence under the field [optional]
 *   placeholder   : the input placeholder (default 'Search the library')
 *   clearLabel    : title and aria-label of the clear button (default 'Clear')
 *   emptyText     : sentence shown while nothing is picked (default 'No items selected.')
 *   noResultsText : sentence shown when a search finds nothing (default 'No matches.')
 *   errorText     : sentence shown when a search fails (default 'Could not search the library.')
 *   removeText    : title and aria-label of a remove button, where {value} is the item's name (default 'Remove {value}')
 *   typeLabels    : names of item types on the second line, such as { BoxSet: 'Collection' } [optional]
 *   height        : the picked list's height, 'auto', 'fill', a number of pixels, or a CSS length, as a List takes it (default 'auto')
 *   maxHeight     : the most the picked list grows before it scrolls [optional]
 *   minHeight     : the least a filling picked list takes [optional]
 *   size          : 'small', 'medium', or 'large' for its fields (default 'medium')
 *   searchFn      : function(query) returning a promise of items, which replaces the Items endpoint [optional]
 *   onChange      : function(items) called when a pick or a removal changes the items [optional]
 * }
 * @returns { element, input, getValue, setValue, setHeight, setSize, destroy }. setValue does not call onChange.
 */
export function createMediaPicker(options?: MediaPickerOptions): MediaPickerHandle {
    options = options || {};
    var opts = options;
    var itemTypes = opts.itemTypes && opts.itemTypes.length ? opts.itemTypes.slice() : ['Movie', 'Series'];
    var maxResults = opts.maxResults || 20;
    var minChars = opts.minChars === undefined ? 2 : opts.minChars;
    var placeholder = opts.placeholder || 'Search the library';
    var typeLabels: Record<string, string> = Object.assign({}, TYPE_LABELS, opts.typeLabels || {});

    var selected: MediaPickerItem[] = [];

    var root = make('div', 'base-media-picker');
    applyFieldSize(root, opts.size);
    var inputId = nextId('media-picker-input');
    if (opts.label) root.appendChild(make('label', 'inputLabel', { for: inputId }, opts.label));

    var search = createSearchField({
        placeholder: placeholder,
        label: opts.label || placeholder,
        clearLabel: opts.clearLabel || 'Clear',
        delay: 0,
        onInput: function (value) {
            // Typing reaches the typeahead through the input event, and a clear by the button or Escape fires none.
            if (!value) typeahead.close();
        }
    });
    var input = search.input;
    input.id = inputId;

    var typeahead = createTypeahead<MediaPickerItem>({
        field: search,
        dropdownClass: 'base-media-picker-results',
        optionClass: 'base-media-picker-option',
        maxResults: maxResults,
        minChars: Math.max(minChars, 1),
        delay: opts.delay === undefined ? 250 : opts.delay,
        noResultsText: opts.noResultsText || 'No matches.',
        errorText: opts.errorText || 'Could not search the library.',
        accept: function (item) { return item.Id != null && !isPicked(item); },
        source: function (query, answer, fail) {
            var found = typeof opts.searchFn === 'function' ? opts.searchFn(query) : searchLibrary(query, itemTypes, maxResults);
            Promise.resolve(found).then(answer, fail);
        },
        render: function (item, option) {
            var card = createMediaCard(cardOptions(item));
            option.appendChild(card.element);
            return card.destroy;
        },
        onChoose: function (item) {
            pick(item);
            search.setValue('');
        },
        // The search field clears the text on the next Escape, so it keeps that Escape while there is text.
        onClose: function () { claimEscape(input, input.value !== ''); }
    });
    root.appendChild(typeahead.element);
    var message = typeahead.status;
    message.classList.add('base-media-picker-message');
    root.appendChild(message);

    if (opts.description) {
        var descId = nextId('media-picker-description');
        root.appendChild(make('div', 'fieldDescription', { id: descId }, opts.description));
        addToken(input, 'aria-describedby', descId);
    }

    // The picked items are bordered list rows, and the list destroys each card when it draws again.
    var picked = createList<MediaPickerItem>({
        element: make('div', 'base-media-picker-items'),
        layout: 'rows',
        emptyText: opts.emptyText || 'No items selected.',
        emptyOutside: true,
        height: opts.height,
        maxHeight: opts.maxHeight,
        minHeight: opts.minHeight,
        render: function (item) {
            var card = createMediaCard(Object.assign(cardOptions(item), {
                actions: [{ label: fill(opts.removeText || 'Remove {value}', item.Name), icon: 'close', value: 'remove' }],
                onAction: function () { remove(key(item)); }
            }));
            card.element.classList.add('base-media-picker-item');
            return card;
        }
    });
    var list = picked.element;
    var empty = picked.emptyElement;
    empty.classList.add('base-media-picker-empty');
    root.appendChild(list);
    root.appendChild(empty);

    function key(item: MediaPickerItem): string { return String(item.Id); }
    function isPicked(item: MediaPickerItem): boolean {
        return selected.some(function (s) { return key(s) === key(item); });
    }

    function subtitleOf(item: MediaPickerItem): string {
        return has(typeLabels, item.Type) ? typeLabels[item.Type] : item.Type;
    }

    // An item with ImageTags but no Primary tag has no image, and one without ImageTags is tried and falls back to the icon.
    function cardOptions(item: MediaPickerItem) {
        var hasImage = hasPrimaryImage(item);
        return {
            layout: 'row' as const,
            shape: mediaShape(item.Type),
            itemId: hasImage ? item.Id : null,
            title: item.Name,
            titleSuffix: item.ProductionYear != null ? String(item.ProductionYear) : null,
            subtitle: subtitleOf(item)
        };
    }

    function emit(): void {
        if (opts.onChange) opts.onChange(getValue());
    }

    function getValue(): MediaPickerItem[] {
        return selected.map(function (s) { return Object.assign({}, s); });
    }

    function renderSelected(): void {
        picked.setItems(selected);
        list.hidden = selected.length === 0;
    }

    function remove(k: string): void {
        var index = -1;
        selected.forEach(function (s, i) { if (key(s) === k) index = i; });
        if (index === -1) return;
        selected.splice(index, 1);
        renderSelected();
        emit();
        focusAfterRemove(list.querySelectorAll<HTMLElement>('.base-media-card-action'), index, input);
    }

    function pick(item: MediaPickerItem): void {
        var n = normalize(item);
        if (!n.Id || isPicked(n)) return;
        if (opts.single) selected = [n];
        else selected.push(n);
        renderSelected();
        emit();
    }

    function setValue(items: MediaPickerItem[] | null): void {
        selected = [];
        (items || []).forEach(function (item) {
            if (!item || item.Id == null) return;
            var n = normalize(item);
            if (!isPicked(n)) selected.push(n);
        });
        if (opts.single) selected = selected.slice(0, 1);
        renderSelected();
    }

    setValue(opts.value || []);

    return {
        element: root,
        input: input,
        getValue: getValue,
        setValue: setValue,
        setSize: function (size?: 'small' | 'medium' | 'large') { applyFieldSize(root, size); },
        setHeight: function (height: ListHeight, maxHeight?: number | string | null) { picked.setHeight(height, maxHeight); },
        destroy: function () {
            typeahead.destroy();
            search.destroy();
            picked.destroy();
        }
    };
}
