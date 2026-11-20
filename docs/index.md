# Jellyfin Plugin Base

Shared configuration page components and C# helpers for Jellyfin plugins, delivered as the `JPKribs.Jellyfin.Base` NuGet package. The source and assets are compiled into each plugin at build time, so a plugin stays a single DLL with nothing extra to ship.

## What It Provides

* **C# components.** A plugin base class, scheduled tasks, outbound HTTP, retry and backoff, secrets at rest, the activity log, paging, SQLite versioning, and text and file helpers. See [C# Components](components/csharp/index.md).
* **Translations.** A plugin declares the Jellyfin strings it uses and adds its own for the rest, and the build checks that no string is said twice. See [Translations](Translations.md).
* **Web components.** Dialogs, tables, card lists, selectors, badges, steps, and the page lifecycle every configuration page repeats, built on `base-` classes and `--base-` tokens. They are written in TypeScript and ship as one ES module with typings for the editor, and fields on a config page validate with no extra code. See [Web Components](components/web/index.md).

## Where to Go

| To | Read |
| :--- | :--- |
| Add Base to a plugin | [Using Base](Usage.md) |
| Use Jellyfin's strings and add the plugin's own | [Translations](Translations.md) |
| Find a C# helper | [C# Components](components/csharp/index.md) |
| Find a page component | [Web Components](components/web/index.md) |
| Release Base or raise it in a plugin | [Releasing](Releasing.md) |
| Add or change a component | [Start Here](https://github.com/JPKribs/jellyfin-plugin-base/blob/main/starthere.md) |
