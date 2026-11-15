# Releasing

How a version of Base is released and how a plugin picks it up.

## Versions

A version is a date, `YYYY.M.D`, in the America/Denver time zone. A second release on the same day is `YYYY.M.D.1`, then `.2`. The version is computed by the workflow and never written into the repository.

A version that already exists on nuget.org or as a tag is refused, never skipped.

## Start a Release

Open the repository's **Actions** tab, select **Release**, and choose **Run workflow** on `main`. A run from any other branch does nothing. Leave the version blank to release today's date, or type one such as `2026.10.3.1` to override it. One run does everything, in this order.

1. Computes the version and checks it against nuget.org and the repository's tags.
2. Bundles the CSS and JavaScript with `scripts/bundle.sh`, which type checks the TypeScript and builds the typings.
3. Checks the bundle against its golden copy, the typings against their test, and the docs with `node scripts/build-docs.mjs --check`.
4. Runs the JavaScript tests, then the C# tests, which also check the CSS for its older-engine fallbacks.
5. Packs `JPKribs.Jellyfin.Base` with the version.
6. Tags `vYYYY.M.D` and creates the GitHub release with generated notes and the package attached.
7. Pushes the package to nuget.org.

The tag and the release come first, because a version on nuget.org can never be deleted. If a run fails after tagging, run it again on the same commit. It runs the checks again, keeps the tag and the release, and pushes the package.

The push uses nuget.org's Trusted Publishing, so no API key is stored. The package's publishing policy on nuget.org names this repository and `release.yaml`.

## Test Before a Release

* Bundle and run the same checks the workflow runs.

    ```bash
    bash scripts/bundle.sh && node scripts/check-bundle.mjs && bash scripts/check-types.sh && node scripts/build-docs.mjs --check
    ```

* Run the C# tests.

    ```bash
    dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release
    ```

* Run the JavaScript tests.

    ```bash
    node --import ./JPKribs.Jellyfin.Base.Tests/js/register.mjs --test JPKribs.Jellyfin.Base.Tests/js/*.test.mjs
    ```

* Make a local package dated the same way, to build a plugin against before the release.

    ```bash
    bash scripts/pack.sh
    ```

## Raise Base in a Plugin

Change the `PackageReference` version in the plugin's project file.

```xml
<PackageReference Include="JPKribs.Jellyfin.Base" Version="2026.10.28" />
```

Build the plugin with no warnings, run its tests, and open its pages. Never commit a plugin against an unreleased package.
