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
B.openDialog({ title: 'Title' });
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
// @ts-expect-error dom-util helpers are not exported from the bundle.
B.make('div');
// @ts-expect-error classNames is not exported from the bundle.
B.classNames('a');

export { page, table, result, secret, label, kept, states, safe };
