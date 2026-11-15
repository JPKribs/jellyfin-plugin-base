# Releasing

How a version of Base is released and how a plugin picks it up.

## Versions

A version is a date, `YYYY.M.D`, in the America/Denver time zone. A second release on the same day is `YYYY.M.D.1`, then `.2`. The version is computed by the workflow and never written into the repository.

A version that already exists on nuget.org or as a tag is refused, never skipped.

## Start a Release

Open the repository's **Actions** tab, select **Release**, and choose **Run workflow** on the default branch. Leave the version blank. One run does everything, in this order.

1. Checks the version against nuget.org and the repository's tags.
2. Runs the JavaScript tests, then the C# tests, which also check the CSS for its older-engine fallbacks.
3. Bundles the CSS and JavaScript and packs `JPKribs.Jellyfin.Base` with the version.
4. Tags `vYYYY.M.D` and creates the GitHub release with generated notes.
5. Pushes the package to nuget.org.

The tag and the release come first, because a version on nuget.org can never be deleted. If a run fails after tagging, run it again on the same commit. It keeps the tag and the release and only pushes the package.

The push uses nuget.org's Trusted Publishing, so no API key is stored. The package's publishing policy on nuget.org names this repository and `release.yaml`.

## Test Before a Release

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

To raise several plugins at once, run `scripts/sync-plugins.sh` with the release's commit SHA, its package version, and the plugin folders. It writes the shared build files and the `PackageReference`, prints every file it changes, and commits nothing. Add `--check` to list the differences without changing anything.

Build the plugin with no warnings, run its tests, and open its pages. Never commit a plugin against an unreleased package.
