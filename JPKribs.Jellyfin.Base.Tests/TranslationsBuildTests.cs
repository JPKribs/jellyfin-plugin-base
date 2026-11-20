using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
using System.Text.Json;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Builds a small plugin project with the translations targets, the built task, and the Jellyfin strings that
/// scripts/bundle.sh fetched, as a plugin builds with the package.
/// </summary>
public sealed class TranslationsBuildTests : IDisposable
{
    private readonly string _project = Directory.CreateTempSubdirectory("base-translations-").FullName;

    /// <inheritdoc />
    public void Dispose() => Directory.Delete(_project, true);

    /// <summary>
    /// A clean plugin builds, embeds one file per language, and compiles against TranslationKeys.
    /// True: a plugin gets its strings and Jellyfin's in its DLL, and its keys as constants.
    /// False: the strings would be missing at runtime, or a key would not compile.
    /// </summary>
    [Fact]
    public void CleanStrings_BuildAndEmbedEveryLanguage()
    {
        Write("Localization/en-us.json", "{\"MyPluginTitle\": \"My Plugin Title\", \"QuotaLeft\": \"{0} of {1} left\"}");
        Write("Localization/de.json", "{\"MyPluginTitle\": \"Mein Plugin\"}");
        Write("Uses.cs", "namespace Fixture; public static class Uses { public static string[] Keys => new[] { JPKribs.Jellyfin.Base.TranslationKeys.MyPluginTitle, JPKribs.Jellyfin.Base.TranslationKeys.Favorites, JPKribs.Jellyfin.Base.TranslationKeys.LogLevel_Trace }; }");
        Project("<JellyfinString Include=\"Favorites;LogLevel.Trace\" /><JellyfinString Include=\"Books\" Source=\"server\" />");

        var (code, output) = Build();
        Assert.True(code == 0, output);
        Assert.DoesNotContain("JPKT", output, StringComparison.Ordinal);

        var resources = Resources();
        Assert.Contains("JPKribs.Translations.en-us.json", resources.Keys);
        Assert.True(resources.Count > 20, string.Join(", ", resources.Keys));
        var german = JsonSerializer.Deserialize<System.Collections.Generic.Dictionary<string, string>>(resources["JPKribs.Translations.de.json"])!;
        Assert.Equal("Mein Plugin", german["MyPluginTitle"]);
        Assert.Equal("Favoriten", german["Favorites"]);
        Assert.Equal("Bücher", german["Books"]);
        Assert.DoesNotContain(resources.Keys, k => k.Contains("Localization", StringComparison.Ordinal));
    }

    /// <summary>
    /// A string said twice fails the build at its file and line, and a text match only warns.
    /// True: the author sees the problem in the editor's error list.
    /// False: a duplicate would ship, or a warning would block the build.
    /// </summary>
    [Fact]
    public void Problems_AreReportedAtTheirLine()
    {
        Write("Localization/en-us.json", "{\n  \"MyPluginTitle\": \"My Plugin Title\",\n  \"MyPluginTitle\": \"Again\",\n  \"Network\": \"Network\"\n}");
        Project("<JellyfinString Include=\"Favorites\" />");

        var (code, output) = Build();
        Assert.NotEqual(0, code);
        Assert.Contains("en-us.json(3,3): Translations error JPKT002", output, StringComparison.Ordinal);
        Assert.Contains("en-us.json(4,3): Translations warning JPKT006", output, StringComparison.Ordinal);

        Write("Localization/en-us.json", "{\"MyPluginTitle\": \"My Plugin Title\", \"Network\": \"Network\"}");
        (code, output) = Build();
        Assert.True(code == 0, output);
        Assert.Contains("warning JPKT006", output, StringComparison.Ordinal);
    }

    /// <summary>
    /// A plugin with no Localization files and no JellyfinString items builds as before.
    /// True: a plugin that does not translate sees no change.
    /// False: every plugin would need translations to build.
    /// </summary>
    [Fact]
    public void NoTranslations_DoesNothing()
    {
        Project(string.Empty);
        var (code, output) = Build();
        Assert.True(code == 0, output);
        Assert.Empty(Resources());
        Assert.False(Directory.Exists(Path.Combine(_project, "obj", "Debug", "net10.0", "base-translations")));
    }

    private void Project(string items)
    {
        var root = Root();
        Write("Fixture.csproj", $"""
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <Nullable>enable</Nullable>
                <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
                <BaseJellyfinStringsDirectory>{Path.Combine(root, "dist", "jellyfin")}/</BaseJellyfinStringsDirectory>
                <BaseTasksAssembly>{typeof(Tasks.BaseBuildTranslations).Assembly.Location}</BaseTasksAssembly>
              </PropertyGroup>
              <ItemGroup>{items}</ItemGroup>
              <Import Project="{Path.Combine(root, "build", "JPKribs.Jellyfin.Base.Translations.targets")}" />
            </Project>
            """);
    }

    private (int Code, string Output) Build()
    {
        var dotnet = Path.GetFileNameWithoutExtension(Environment.ProcessPath) == "dotnet" ? Environment.ProcessPath! : "dotnet";
        var start = new ProcessStartInfo(dotnet, "build -nologo -nodeReuse:false -p:UseSharedCompilation=false")
        {
            WorkingDirectory = _project,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };

        // The test host's MSBuild settings would point the child build at the test run's own SDK state.
        foreach (var name in start.Environment.Keys.Where(k => k.StartsWith("MSBUILD", StringComparison.OrdinalIgnoreCase) || k.StartsWith("VSTEST", StringComparison.OrdinalIgnoreCase)).ToList())
        {
            start.Environment.Remove(name);
        }

        using var process = Process.Start(start)!;
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        process.WaitForExit();
        return (process.ExitCode, output.Result + error.Result);
    }

    private System.Collections.Generic.Dictionary<string, byte[]> Resources()
    {
        using var stream = File.OpenRead(Path.Combine(_project, "bin", "Debug", "net10.0", "Fixture.dll"));
        using var pe = new PEReader(stream);
        var metadata = pe.GetMetadataReader();
        var resources = new System.Collections.Generic.Dictionary<string, byte[]>(StringComparer.Ordinal);
        var directory = pe.GetSectionData(pe.PEHeaders.CorHeader!.ResourcesDirectory.RelativeVirtualAddress);
        foreach (var handle in metadata.ManifestResources)
        {
            var resource = metadata.GetManifestResource(handle);
            var reader = directory.GetReader((int)resource.Offset, directory.Length - (int)resource.Offset);
            resources[metadata.GetString(resource.Name)] = reader.ReadBytes(reader.ReadInt32());
        }

        return resources;
    }

    private void Write(string relative, string text)
    {
        var path = Path.Combine(_project, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, text);
    }

    private static string Root()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "jellyfin.json")))
        {
            dir = dir.Parent;
        }

        return dir?.FullName ?? throw new InvalidOperationException("The repository root, with jellyfin.json, was not found.");
    }
}
