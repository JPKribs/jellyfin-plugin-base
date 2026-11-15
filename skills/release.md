# Release

How to release Base, from the checks to the version every plugin then picks up. Every step here is a [stop and ask](../starthere.md#stop-and-ask) item, since a release publishes to NuGet and a published version can never be deleted.

## Versions

A version is a date, `YYYY.M.D`, with no leading zeros, such as `2026.10.28`.

* The date is the calendar date in `America/Denver`, not UTC.
* A second release on the same day is `YYYY.M.D.1`, then `.2`, and so on.
* The version is never written into the repository. The csproj default, `0.0.0-local`, only marks a pack made outside the workflow.
* The release tag is the version with a `v` in front, such as `v2026.10.28`.

A date carries no meaning about the change. Compatibility is judged by [code.md](code.md#compatibility) before the release, not by the number.

## Before the Release

1. **Scope.** Everything since the last tag is reviewed with [review.md](review.md). Any public removal or rename was approved.

    ```bash
    git log --oneline "$(git describe --tags --abbrev=0)"..HEAD
    ```

2. **Tests.** Both suites pass. CI runs only the first, so run the second yourself.

    ```bash
    dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release
    ```

    ```bash
    node --test JPKribs.Jellyfin.Base.Tests/js/*.test.mjs
    ```

3. **Bundle and pack.** Make a local package the way the workflow does.

    ```bash
    scripts/pack.sh
    ```

    It runs `scripts/bundle.sh`, which needs Node and runs `npx --yes esbuild`, then packs `nupkg/JPKribs.Jellyfin.Base.<version>.nupkg`. Pass a version to override, such as `scripts/pack.sh 2026.11.14.1`.

4. **Consumer build.** Build at least one plugin that uses the changed components against the local pack, per [testing.md](testing.md#consumer-build). Build one with strict analyzers.
5. **Docs.** The README and the [component pages](documentation.md#the-component-pages) describe this release, and `mkdocs build --strict` passes.
6. **Branch.** The commit to release is pushed to the default branch, since the workflow releases the commit it starts on.

## Start the Release

1. Open the repository's **Actions** tab, select **Release**, and choose **Run workflow** on the default branch.
2. Leave the version blank to release today's date. Type a version only to override it, such as to re-release a specific date.

The `.github/workflows/release.yaml` run does the whole release, in this order.

| Step | What it does |
| :--- | :--- |
| Resolve version | Takes the date, or the override, and adds `.1`, `.2` until neither nuget.org nor a tag has it. A requested version that exists is refused. A tag on this commit with no package behind it is resumed. |
| Test | Runs `dotnet test` on the test project in Release. |
| Bundle and pack | Runs `scripts/bundle.sh`, then `dotnet pack` with `-p:Version=<version>`. |
| Tag and release | Pushes `v<version>`, then creates the GitHub release with the package attached and generated notes. Each is skipped when an earlier run made it. |
| Log in to nuget.org | Uses Trusted Publishing, so no key is stored. The publishing policy on nuget.org names this repository and `release.yaml`. |
| Push to nuget.org | Pushes the package with `--skip-duplicate`. |

The tag and release come before the push because a nuget.org version can never be deleted. When a run fails after tagging, run it again on the same commit and it resumes with the missing push.

## After the Release

1. **Verify.** The package page on nuget.org shows the version, and the GitHub release has the package attached and its notes.
2. **Tell the plugins.** Each plugin that wants the release raises its reference. See [How Plugins Pick It Up](#how-plugins-pick-it-up).
3. **Docs.** The docs site publishes from its own workflow when `docs/` changes and is not part of a release. See [documentation.md](documentation.md#publishing-the-site).

## How Plugins Pick It Up

A plugin raises the `JPKribs.Jellyfin.Base` version in its project file.

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.10.28" />
```

For several plugins at once, `scripts/sync-plugins.sh` writes the plugin template into each checkout, pinned to one release. It takes the full commit SHA of the release tag, the version, and the plugin folders.

```bash
scripts/sync-plugins.sh --check "$(git rev-parse v2026.10.28)" 2026.10.28 ../../jellyfin-plugin-*
```

```bash
scripts/sync-plugins.sh "$(git rev-parse v2026.10.28)" 2026.10.28 ../../jellyfin-plugin-*
```

* `--check` changes nothing, lists what differs, and exits 1 when anything does. Run it first.
* The second form rewrites each plugin's `build.sh`, its `.github/workflows` callers, and the `PackageReference` version. It prints each file it changes and commits nothing.
* The script lives in Base and does the plugin side, so the plugin author reviews the diff and commits it in the plugin.

After the raise, each plugin:

1. Deletes any local copy of a type Base now provides, since the same name is ambiguous.
2. Builds with no warning, runs its tests, and opens its pages.
3. Commits the version raise on its own.

Never commit a plugin against an unreleased pack.

## When a Release Is Wrong

* Never reuse a published version. Fix it in a new release.
* Then release the fix at once, and tell the plugins that raised the bad version.

## Checklist

* [ ] The version is a date, and the workflow resolved it.
* [ ] Nothing public was removed or renamed without approval.
* [ ] `dotnet test` and the JS tests pass.
* [ ] A plugin built against the local pack with no warning.
* [ ] The README and the inventories describe this release.
* [ ] The release ran from the default branch, with the version blank unless an override was approved.
* [ ] The GitHub release and the nuget.org version both exist.
* [ ] Each plugin raised its reference, or was told to.
