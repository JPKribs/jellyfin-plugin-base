// register.mjs
// Registers ts-loader.mjs before the JS tests run, so a test can import the TypeScript sources in src/js.
//
//   node --import ./JPKribs.Jellyfin.Base.Tests/js/register.mjs --test JPKribs.Jellyfin.Base.Tests/js/*.test.mjs

import { register } from 'node:module';

register('./ts-loader.mjs', import.meta.url);
