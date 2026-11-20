// page-script.ts
// The entry of the standalone page script, which scripts/build-page-script.mjs bundles into BasePageScript.Script, for a page that
// loads neither the bundle nor its CSS. It sets the global BasePage from the push and casing cores the bundle uses, and holds no
// text of its own, so the page supplies every word. Internal to the web components.
import { pushState, pushSubscribe, pushUnsubscribe, pushLabel } from './push.js';
import { convertCase, mergeCasing, DEFAULT_CASING } from './text-case.js';

(window as unknown as { BasePage: unknown }).BasePage = {
    webPushState: pushState,
    subscribeWebPush: pushSubscribe,
    unsubscribeWebPush: pushUnsubscribe,
    webPushLabel: pushLabel,
    titleCase: function (text: string, casing?: string[] | null, language?: string | null): string {
        return convertCase(text, mergeCasing(DEFAULT_CASING, casing), language, true);
    },
    sentenceCase: function (text: string, casing?: string[] | null, language?: string | null): string {
        return convertCase(text, mergeCasing(DEFAULT_CASING, casing), language, false);
    }
};
