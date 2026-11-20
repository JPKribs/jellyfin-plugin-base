# Release

How to release Base, from the checks to the version every plugin then picks up. Every step here is a [stop and ask](../starthere.md#stop-and-ask) item, since a release publishes to NuGet and a published version can never be deleted.

## Versions

A version is `<jellyfin>.<X>`, such as `12.4.0`. `<jellyfin>` is the Jellyfin version Base targets, the `jellyfin` value in `jellyfin.json`, and `X` counts the releases for it.

* The first release for a Jellyfin version is `.0`, then `.1`, `.2`, and so on. The workflow takes the next `X` after the highest one on nuget.org or in the tags.
* Moving `jellyfin.json` to a new Jellyfin version, such as `12.5`, starts `X` over at `12.5.0`. See [Move to Another Jellyfin Release](#move-to-another-jellyfin-release).
* The version is never written into the repository. The csproj default, `0.0.0-local`, only marks a pack made outside the workflow.
* The release tag is the version with a `v` in front, such as `v12.4.0`.

The package carries the GNU General Public License v3.0. The csproj sets `<PackageLicenseExpression>GPL-3.0-only</PackageLicenseExpression>` and packs `LICENSE` beside `README.md`. Jellyfin's strings ship in `jellyfin/` with Jellyfin's own `LICENSE`, the GPL v2.0 or later.

`X` carries no meaning about the change. Compatibility is judged by [code.md](code.md#compatibility) before the release, not by the number.

The packages released before this scheme are dated, such as `2026.11.21`. NuGet orders them above `12.4.0`, so each one is unlisted on nuget.org, which keeps it out of search and out of a floating version, and each plugin's `renovate.json` holds Base below `1000`.

## Move to Another Jellyfin Release

`jellyfin.json` names the Jellyfin version and the tags the strings come from.

```json
{ "jellyfin": "12.4", "strings": { "web": "v12.4", "server": "v12.4" } }
```

`scripts/bump-jellyfin.mjs` changes it. It checks that each tag exists, writes the file, fetches the strings, and lists the US English keys that were added, removed, or reworded. A removed key fails the build of a plugin that declares it.

* New strings from a Jellyfin patch release, with the same version:

    ```bash
    npm run strings:bump -- v12.4.1
    ```

* One source only, with `--web v12.4.1` or `--server v12.4.1`.
* A new Jellyfin version, which also moves the test project's `Jellyfin.Controller` and `Jellyfin.Model` to `<version>.0`, and makes the next release `<version>.0`:

    ```bash
    npm run strings:bump -- --jellyfin 12.5
    ```

Run the checks and tests after a bump, and build a plugin against a local pack.

## Before the Release

1. **Scope.** Everything since the last tag is reviewed with [review.md](review.md). Any public removal or rename was approved.

    ```bash
    git log --oneline "$(git describe --tags --abbrev=0)"..HEAD
    ```

2. **Checks and tests.** Run what the workflow runs, in its order, and read each result. The workflow refuses to pack when one fails.

    ```bash
    npm run bundle
    ```

    ```bash
    node scripts/check-bundle.mjs && bash scripts/check-types.sh && node scripts/build-docs.mjs --check
    ```

    ```bash
    node --import ./JPKribs.Jellyfin.Base.Tests/js/register.mjs --test JPKribs.Jellyfin.Base.Tests/js/*.test.mjs
    ```

    ```bash
    dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release
    ```

3. **Bundle and pack.** Make a local package the way the workflow does.

    ```bash
    scripts/pack.sh
    ```

    It runs `scripts/bundle.sh`, which needs Node and git, installs the pinned dev tools from `package-lock.json`, type checks, bundles, and fetches Jellyfin's strings when `dist/jellyfin/` does not match `jellyfin.json`. It then packs `nupkg/JPKribs.Jellyfin.Base.<version>.nupkg`, where the version is the next release's with a dev suffix, such as `12.4.1-dev.20261120153000`, so it never takes the real release's place in the NuGet cache. Pass a version to override, such as `scripts/pack.sh 12.4.1-dev.1`.

4. **Consumer build.** Build at least one plugin that uses the changed components against the local pack, per [testing.md](testing.md#consumer-build). Build one with strict analyzers.
5. **Docs.** The README and the [component pages](documentation.md#the-component-pages) describe this release, and `mkdocs build --strict` passes.
6. **Gallery.** Every component changed since the last tag looks right in the [gallery](testing.md#the-gallery) at desktop, tablet, and phone width, and the [layout audit](testing.md#the-layout-audit) returns an empty list at each.
7. **Branch.** The commit to release is pushed to `main`, since the workflow releases the commit it starts on and refuses to run from any other branch.

## Start the Release

1. Open the repository's **Actions** tab, select **Release**, and choose **Run workflow** on `main`.
2. Leave the version blank to release the next `X`. Type a version only to override it, such as to finish a version an earlier run tagged.

The `.github/workflows/release.yaml` run does the whole release. Its job has an `if:` guard that runs it only on `refs/heads/main`, so a dispatch from any other branch publishes nothing. It runs in the `release` concurrency group with `cancel-in-progress: false`, so a second run waits for the first instead of racing it. It runs these steps in this order.

| Step | What it does |
| :--- | :--- |
| Resolve version | Reads the Jellyfin version from `jellyfin.json` and takes the next `X` after the highest one on nuget.org or in the tags, or the override, which must be `<jellyfin>.N`. A requested version that exists is refused. A tag on this commit with no package behind it is resumed. |
| Bundle | Runs `scripts/bundle.sh`, which installs the pinned dev tools, type checks, bundles, and fetches Jellyfin's strings at the tags in `jellyfin.json`. |
| Check | Runs `scripts/check-bundle.mjs`, `scripts/check-types.sh`, and `scripts/build-docs.mjs --check`. |
| Test | Runs the JavaScript tests, then `dotnet test` on the test project in Release. |
| Pack | Runs `dotnet pack` with `-p:Version=<version>`. The pack builds the translations task and packs it under `tasks/`, with Jellyfin's strings under `jellyfin/`. |
| Check package | Runs `scripts/check-package.sh` on the package, so a file the targets load cannot be missing or misplaced. |
| Tag and release | Pushes `v<version>`, then creates the GitHub release with the package attached and generated notes. Each is skipped when an earlier run made it. |
| Log in to nuget.org | Uses Trusted Publishing, so no key is stored. The publishing policy on nuget.org names this repository and `release.yaml`. |
| Push to nuget.org | Pushes the package with `--skip-duplicate`. |

The tag and release come before the push because a nuget.org version can never be deleted. When a run fails after tagging, run it again on the same commit and it resumes with the missing push.

## After the Release

1. **Verify.** The package page on nuget.org shows the version, and the GitHub release has the package attached and its notes.
2. **Tell the plugins.** Each plugin that wants the release raises its reference. See [How Plugins Pick It Up](#how-plugins-pick-it-up).
3. **Docs.** The docs site publishes from its own workflow and is not part of a release. `docs.yaml` runs on a push to `main` that changes `docs/`, `mkdocs.yml`, `src/`, `package.json`, `package-lock.json`, `tsconfig.json`, `scripts/bundle.sh`, `scripts/build-previews.mjs`, the gallery, or the workflow itself. See [documentation.md](documentation.md#publishing-the-site).

## The Public Page

`docs/Releasing.md` is the public mirror of this guide on the docs site. It covers the versions, starting a release, testing before one, and raising Base in a plugin. Change it in the same commit as any change here that a plugin author would see, so the two never disagree.

## How Plugins Pick It Up

A plugin raises the `JPKribs.Jellyfin.Base` version in its project file.

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="12.4.0" />
```

After the raise, each plugin:

1. Deletes any local copy of a type Base now provides, since the same name is ambiguous.
2. Builds with no warning, runs its tests, and opens its pages.
3. Commits the version raise on its own.

Never commit a plugin against an unreleased pack.

## When a Release Is Wrong

* Never reuse a published version. Fix it in a new release.
* Then release the fix at once, and tell the plugins that raised the bad version.

## Checklist

* [ ] The version is `<jellyfin>.<X>` for the Jellyfin version in `jellyfin.json`, and the workflow resolved it.
* [ ] `jellyfin.json` names the Jellyfin release the strings should come from.
* [ ] Nothing public was removed or renamed without approval.
* [ ] `npm run bundle`, the golden copy, typings, and docs checks, the JS tests, and `dotnet test` pass.
* [ ] A plugin built against the local pack with no warning.
* [ ] The README and the inventories describe this release.
* [ ] The release ran from `main`, with the version blank unless an override was approved.
* [ ] The GitHub release and the nuget.org version both exist.
* [ ] Each plugin raised its reference, or was told to.
