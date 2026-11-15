// typings.test.ts
// Checks the shipped typings, dist/jpkribs_shared.d.ts. It imports the bundle by a configurationpage path the way
// a plugin page does. Every export is called the way a plugin would, and each
// line marked as an expected error is a call the typings must reject. Run it with scripts/check-types.sh.

import * as B from './configurationpage?name=test_jpkribs_shared.js';
import type { Shared, PageHandle, PagedResult, TableHandle } from './configurationpage?name=test_jpkribs_shared.js';

declare var view: HTMLElement;
declare var input: HTMLInputElement;

interface Row {
    id: string;
    name: string;
}

var page: PageHandle = B.createConfigPage(view, {
    pluginId: 'guid',
    tabsKey: 'plugin',
    tabs: [{ href: 'configurationpage?name=a', name: 'A' }],
    load: function (shared: Shared) { shared.setStatus('status', 'Saved.'); }
});
var shared: Shared = B.createShared(view, 'guid', 'Plugin');
var table: TableHandle<Row> = B.createPaginatedTable<Row>(view, shared, { containerId: 'rows', endpoint: 'Rows', columns: [{ key: 'name' }] });
var result: PagedResult<Row> = { Items: [], TotalCount: 0, Page: 1, PageSize: 25, TotalPages: 1, HasMore: false };

B.setTabs('plugin', 0, function () { return [{ href: 'x', name: 'X' }]; });
B.initCollapsibles(view);
B.generateGuid({ compact: true });
B.bindSecretField(input, true, { placeholder: 'Kept' });
B.clearSecretField(input);
var secret: string = B.readSecretField(input);
B.errorText(new Error('x'), 'Could not save.').then(function (text: string) { return text; });
B.debounce(function (query: string) { return query; }, 200)('a');
B.downloadJson('export.json', { a: 1 });
B.pickJsonFile();
var label: string = B.plural(2, 'item');
var kept: string = B.SECRET_KEPT;
var states: string[] = B.BADGE_STATES.names;
var safe: string = B.escapeHtml('<b>');
B.copyToClipboard('text');
B.createAvatar({});
B.createUserChip({});
B.createBanner({});
B.createBreadcrumbs({});
B.createSortableCardList<Row>(view, { render: function (row: Row) { return { title: row.name }; } });
B.createCheckboxList({});
B.createChipSelect({ options: ['a', { value: 'b', label: 'B' }] });
B.createChoiceGroup(view, {});
B.createCopyField({});
B.createDefinitionList({});
B.openDialog({ title: 'Title', size: 'large' });
B.bindDialog('dialogId', {});
B.confirmDialog('Remove it?').then(function (yes: boolean) { return yes; });
B.openEditorDialog({});
B.promptDialog([{ name: 'name', value: '' }]);
B.createDivider({});
B.createFieldMessage({});
B.setFieldState(input, 'error', 'Required.');
B.createFilePicker({});
B.createHelpHint({ text: 'Help.' });
B.createKeyValueEditor({});
B.createLogViewer({});
B.createNumberUnitField({ units: ['minutes', { value: 'hours', factor: 60 }] });
B.createOrderedList<Row>({ render: function (row: Row) { return row.name; } });
B.createOverflowMenu({});
B.createPagination({ pageSize: 25, onChange: function (value) { return value.skip + value.take; } });
B.createPillGroup(view, {});
B.insertAtCursor(input, '{name}');
B.placeholderHint([['name', 'The name.']]);
B.bindPlaceholders(view);
B.createProgressRing({});
B.createSchedulePicker({});
B.createSearchField({});
B.createSkeleton({});
B.createSliderField({});
B.createSpinner({});
B.createStatCard({ trend: 3 });
B.createStatusDot({});
B.createStepper({});
B.createStringList({});
B.createSubTabs({});
B.createTagInput({});
B.createTimeline({});
B.createToaster({});
B.setTooltip(input, 'Tip');
B.bindTooltips(view);
B.createUserSelector({});
B.createUserMultiSelector({});
B.balanceRows(view, { minWidth: 160, maxColumns: 4 }).update();
B.bindBalancedRows(view).destroy();
B.createList<Row>({ items: [{ id: '1', name: 'One' }], render: function (row: Row) { return row.name; }, height: 'fill', onEndReached: function () { return undefined; } });
B.createMediaCard({ shape: B.mediaShape('Episode'), title: 'Title', actions: [{ label: 'Remove', icon: 'close', value: 'remove' }] });
B.createMediaPicker({ itemTypes: ['Movie'], onChange: function (items) { return items[0].Id; } });
B.createFolderPicker({});
B.createImagePicker({});
B.createAccessSchedule({ value: [{ DayOfWeek: 'Weekday', StartHour: 16, EndHour: 21.5 }], onChange: function (windows) { return windows[0].EndHour - windows[0].StartHour; } });
B.createMappingTable({ rows: [{ value: 'a', label: 'Movies' }], targets: [{ value: 'm' }], value: { a: 'm' }, unique: true });
B.createFilterPanel({ groups: [{ name: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }] }], value: { status: ['active'] }, onChange: function (value) { return value.status.length; } });
B.createSearchField({ size: 'small' }).setSize('large');
B.createPagination({ size: 'small' });

// @ts-expect-error A page needs its plugin id.
B.createConfigPage(view, {});
// @ts-expect-error The tabs are objects, not names.
B.setTabs('plugin', 0, ['A']);
// @ts-expect-error The count is a number.
B.plural('2', 'item');
// @ts-expect-error A help hint needs its text.
B.createHelpHint({});
// @ts-expect-error A number field needs its units.
B.createNumberUnitField({});
// @ts-expect-error The page size is a number.
B.createPagination({ pageSize: '25' });
// @ts-expect-error A table column needs its key.
B.createPaginatedTable<Row>(view, shared, { containerId: 'rows', endpoint: 'Rows', columns: [{}] });
// @ts-expect-error The trend is a number.
B.createStatCard({ trend: 'up' });
// @ts-expect-error confirmDialog resolves to a boolean.
B.confirmDialog('Remove it?').then(function (yes: string) { return yes; });
// @ts-expect-error A secret field is an input.
B.readSecretField('field');
// @ts-expect-error lib/dom helpers are not exported from the bundle.
B.make('div');
// @ts-expect-error classNames is not exported from the bundle.
B.classNames('a');
// @ts-expect-error minWidth is a number of pixels.
B.balanceRows(view, { minWidth: '160px' });
// @ts-expect-error A dialog size is small, medium, or large.
B.openDialog({ size: 'wide' });
// @ts-expect-error A list needs render.
B.createList({ items: [1] });
// @ts-expect-error A list height is auto, fill, or a length.
B.createList({ render: function () { return ''; }, height: true });
// @ts-expect-error The layout is a row or a card.
B.createMediaCard({ layout: 'grid' });
// @ts-expect-error An action needs its icon and value.
B.createMediaCard({ actions: [{ label: 'Remove' }] });
// @ts-expect-error searchFn returns a promise of items.
B.createMediaPicker({ searchFn: function (query: string) { return [query]; } });
// @ts-expect-error The path is text.
B.createFolderPicker({ value: 5 });
// @ts-expect-error The shape is square, portrait, or wide.
B.createImagePicker({ shape: 'round' });
// @ts-expect-error A day is a Jellyfin day name or number, not a list.
B.createAccessSchedule({ value: [{ DayOfWeek: ['Monday'] }] });
// @ts-expect-error The step is a number of hours.
B.createAccessSchedule({ step: '0.5' });
// @ts-expect-error The mapping value maps strings to strings.
B.createMappingTable({ value: { a: 1 } });
// @ts-expect-error A filter group needs its options.
B.createFilterPanel({ groups: [{ name: 'status', label: 'Status' }] });
// @ts-expect-error A picked value is an array of strings.
B.createFilterPanel({ value: { status: 'active' } });
// @ts-expect-error The size is small, medium, or large.
B.createTagInput({ size: 'huge' });

// The options that shape one component into its final state.
B.createCheckbox({ label: 'Enabled', size: 'large', description: 'Sync it.', boxed: false });
B.createCheckbox({ ariaLabel: 'Enabled', field: true, boxed: true }).setIndeterminate(true);
// @ts-expect-error The checkbox size is small, medium, or large.
B.createCheckbox({ size: 'huge' });
B.createStatCard({ value: 'Delivered 3m ago', label: 'Queue', detail: ['Next in 5m'], layout: 'label-top', valueColor: 'green' });
// @ts-expect-error The layout is value-top or label-top.
B.createStatCard({ layout: 'side' });
B.createDefinitionList({ layout: 'columns', arrow: true, items: [{ label: 'From', value: 'Living Room', meta: '12 GB', note: 'Main' }] });
B.createCompareTable({ columns: [{ key: 'a', label: 'A' }], rows: [{ section: 'Genres' }, { note: 'Changed by a rule.' }] });
var grid = B.createMatrixGrid({ rows: [{ key: 'speed', label: 'Speed', cells: { at: null } }], columns: [{ key: 'limit', label: 'Limit', type: 'number', unit: 'Mbps' }, { key: 'role', label: 'Role', type: 'badge' }], note: 'Speeds are per server.' });
grid.setColumnHidden('limit', true);
var section = B.createCollapsibleSection({ title: 'Movies', icon: 'movie', subtitle: 'Living Room to Office', collapsible: false });
section.setSubtitle(null);
section.setAside(document.createElement('span'));
B.createQrCode({ value: 'https://example.com', layout: 'inline', showText: 'Show QR Code' }).open();
// @ts-expect-error The layout is full or inline.
B.createQrCode({ layout: 'popup' });
var pie: B.PieChartHandle = B.createPieChart({ label: 'Storage', donut: true, centerText: '2.2k', centerLabel: 'Total', size: 'small', slices: [{ label: 'Movies', value: 820, color: '#e91e63' }], onSelect: function (slice: B.PieSlice | null, index: number) { return slice ? index : -1; } });
pie.setSlices([{ label: 'Shows', value: 1 }]);
pie.select(null);
// @ts-expect-error The size is small, medium, or large.
B.createPieChart({ size: 'huge' });
var thumbColumn: B.TableColumn<Row> = { key: 'name', label: 'Name', image: function () { return function () { return Promise.resolve(new Blob()); }; } };

export { page, table, result, secret, label, kept, states, safe };
