// ts-loader.mjs
// A node module hook that loads the TypeScript sources in src/js for the JS tests. It strips the types with
// node's own stripTypeScriptTypes, so the tests need no install.

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

// resolve
// Maps a relative './name.js' import to './name.ts' when only the TypeScript file exists.
// Param: specifier   | what the importing module asked for
// Param: context     | the importer and the import conditions
// Param: nextResolve | the default resolver
// Returns: the resolved URL
export async function resolve(specifier, context, nextResolve) {
    if (context.parentURL && context.parentURL.startsWith('file:') && /^\.{1,2}\/.*\.js$/.test(specifier)) {
        var url = new URL(specifier, context.parentURL);
        var tsUrl = new URL(url.href.replace(/\.js$/, '.ts'));
        if (!existsSync(fileURLToPath(url)) && existsSync(fileURLToPath(tsUrl))) {
            return { url: tsUrl.href, format: 'module', shortCircuit: true };
        }
    }
    return nextResolve(specifier, context);
}

// load
// Loads a .ts file as an ES module with its types replaced by spaces, so line numbers stay the same.
// Param: url      | the module to load
// Param: context  | the load context
// Param: nextLoad | the default loader
// Returns: the module source
export async function load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts')) {
        var source = await readFile(fileURLToPath(url), 'utf8');
        return { format: 'module', source: stripTypeScriptTypes(source, { mode: 'strip' }), shortCircuit: true };
    }
    return nextLoad(url, context);
}
