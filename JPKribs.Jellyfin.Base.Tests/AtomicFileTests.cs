using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="AtomicFile"/> never leaves a part written file, and that a failed write keeps the old file and leaves no temp file.</summary>
public sealed class AtomicFileTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "base-atomic-" + Guid.NewGuid().ToString("N"));

    public AtomicFileTests() => Directory.CreateDirectory(_dir);

    public void Dispose() => Directory.Delete(_dir, recursive: true);

    private string FilePath(string name = "data.bin") => Path.Combine(_dir, name);

    private string[] Files() => Directory.GetFileSystemEntries(_dir).Select(Path.GetFileName).Order(StringComparer.Ordinal).ToArray()!;

    /// <summary>
    /// A write creates the file when it is absent and replaces it when it is there.
    /// True: the file holds the newest bytes and nothing else is left in the folder.
    /// False: an old byte would survive or a temp file would stay behind.
    /// </summary>
    [Fact]
    public void WriteAllBytes_CreatesAndReplaces()
    {
        var path = FilePath();

        AtomicFile.WriteAllBytes(path, new byte[] { 1, 2, 3 });
        AtomicFile.WriteAllBytes(path, new byte[] { 9 });

        Assert.Equal(new byte[] { 9 }, File.ReadAllBytes(path));
        Assert.Equal(new[] { "data.bin" }, Files());
    }

    /// <summary>
    /// The temp file sits in the same folder as the target and the target still holds the old bytes until the move.
    /// True: the move stays on one volume, so it is atomic.
    /// False: a temp file in another folder could make the move a copy that a crash cuts short.
    /// </summary>
    [Fact]
    public void WriteAllBytes_UsesATempFileInTheSameFolder()
    {
        var path = FilePath();
        File.WriteAllBytes(path, new byte[] { 1 });
        string? tempFolder = null;
        byte[]? targetDuringWrite = null;
        bool tempExisted = false;

        AtomicFile.WriteAllBytes(path, new byte[] { 2 }, beforeMove: temp =>
        {
            tempFolder = Path.GetDirectoryName(temp);
            tempExisted = File.Exists(temp);
            targetDuringWrite = File.ReadAllBytes(path);
        });

        Assert.Equal(_dir, tempFolder);
        Assert.True(tempExisted);
        Assert.Equal(new byte[] { 1 }, targetDuringWrite);
        Assert.Equal(new byte[] { 2 }, File.ReadAllBytes(path));
        Assert.Equal(new[] { "data.bin" }, Files());
    }

    /// <summary>
    /// A failure before the move leaves the old file and removes the temp file.
    /// True: a crash in the middle of a save loses nothing.
    /// False: the old file would be damaged or a temp file would pile up.
    /// </summary>
    [Fact]
    public void WriteAllBytes_WhenTheHookFails_KeepsTheOldFileAndRemovesTheTemp()
    {
        var path = FilePath();
        File.WriteAllBytes(path, new byte[] { 1 });

        Assert.Throws<InvalidOperationException>(() =>
            AtomicFile.WriteAllBytes(path, new byte[] { 2 }, beforeMove: _ => throw new InvalidOperationException("stop")));

        Assert.Equal(new byte[] { 1 }, File.ReadAllBytes(path));
        Assert.Equal(new[] { "data.bin" }, Files());
    }

    /// <summary>
    /// A missing folder fails and creates nothing.
    /// True: a typo in a path does not create folders.
    /// False: the helper would invent a folder tree.
    /// </summary>
    [Fact]
    public void WriteAllBytes_WithAMissingFolder_ThrowsAndCreatesNothing()
    {
        var path = Path.Combine(_dir, "missing", "data.bin");

        Assert.Throws<DirectoryNotFoundException>(() => AtomicFile.WriteAllBytes(path, new byte[] { 1 }));

        Assert.False(Directory.Exists(Path.Combine(_dir, "missing")));
    }

    /// <summary>
    /// The flush can be turned off and the bytes still arrive.
    /// True: a caller that does not need durability still gets a whole file.
    /// False: skipping the flush would skip the write.
    /// </summary>
    [Fact]
    public void WriteAllBytes_WithoutFlush_StillWrites()
    {
        var path = FilePath();

        AtomicFile.WriteAllBytes(path, new byte[] { 5, 6 }, flushToDisk: false);

        Assert.Equal(new byte[] { 5, 6 }, File.ReadAllBytes(path));
    }

    /// <summary>
    /// Owner only writes leave a file only the owner can read, on systems that have Unix permissions.
    /// True: a secret is never readable by another account, not even for a moment.
    /// False: the file would take the default mode.
    /// </summary>
    [Fact]
    public void WriteAllBytes_OwnerOnly_SetsOwnerReadWrite()
    {
        var path = FilePath();

        AtomicFile.WriteAllBytes(path, new byte[] { 1 }, ownerOnly: true);

        if (!OperatingSystem.IsWindows())
        {
            Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
        }

        Assert.Equal(new byte[] { 1 }, File.ReadAllBytes(path));
    }

    /// <summary>
    /// An empty or missing path is refused.
    /// True: a bad call fails where it is made.
    /// False: a temp file would be made beside a path nobody named.
    /// </summary>
    [Fact]
    public void WriteAllBytes_WithABadPath_Throws()
    {
        Assert.Throws<ArgumentException>(() => AtomicFile.WriteAllBytes(string.Empty, new byte[1]));
        Assert.Throws<ArgumentNullException>(() => AtomicFile.WriteAllBytes(null!, new byte[1]));
    }

    /// <summary>
    /// The writer's bytes replace the file, and the writer sees the temp file's stream.
    /// True: a large body can be streamed to disk without holding it in memory.
    /// False: the stream would be the target, and a reader would see the file part written.
    /// </summary>
    [Fact]
    public async Task WriteAsync_WritesTheStreamedContent()
    {
        var path = FilePath();
        await File.WriteAllBytesAsync(path, new byte[] { 1 });

        await AtomicFile.WriteAsync(path, (stream, ct) => stream.WriteAsync(new byte[] { 7, 8, 9 }, ct).AsTask(), CancellationToken.None);

        Assert.Equal(new byte[] { 7, 8, 9 }, await File.ReadAllBytesAsync(path));
        Assert.Equal(new[] { "data.bin" }, Files());
    }

    /// <summary>
    /// A writer that fails halfway leaves the old file and no temp file.
    /// True: a download that dies midway never replaces the good copy.
    /// False: the old file would be replaced by a part written one.
    /// </summary>
    [Fact]
    public async Task WriteAsync_WhenTheWriterFails_KeepsTheOldFileAndLeavesNoTemp()
    {
        var path = FilePath();
        await File.WriteAllBytesAsync(path, new byte[] { 1, 1, 1 });

        await Assert.ThrowsAsync<InvalidOperationException>(() => AtomicFile.WriteAsync(
            path,
            async (stream, ct) =>
            {
                await stream.WriteAsync(new byte[] { 2, 2 }, ct);
                throw new InvalidOperationException("dropped");
            },
            CancellationToken.None));

        Assert.Equal(new byte[] { 1, 1, 1 }, await File.ReadAllBytesAsync(path));
        Assert.Equal(new[] { "data.bin" }, Files());
    }

    /// <summary>
    /// A cancelled token stops the write, keeps the old file, and removes the temp file.
    /// True: a shutdown in the middle of a save is safe.
    /// False: a cancelled write would leave a temp file or replace the file.
    /// </summary>
    [Fact]
    public async Task WriteAsync_WhenCancelled_KeepsTheOldFileAndLeavesNoTemp()
    {
        var path = FilePath();
        await File.WriteAllBytesAsync(path, new byte[] { 1 });
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => AtomicFile.WriteAsync(
            path,
            (stream, ct) => stream.WriteAsync(new byte[] { 2 }, ct).AsTask(),
            cts.Token));

        Assert.Equal(new byte[] { 1 }, await File.ReadAllBytesAsync(path));
        Assert.Equal(new[] { "data.bin" }, Files());
    }

    /// <summary>
    /// The streamed write uses a temp file in the same folder, and the target keeps its old bytes until the move.
    /// True: the move stays on one volume.
    /// False: the swap could cross volumes and stop being atomic.
    /// </summary>
    [Fact]
    public async Task WriteAsync_UsesATempFileInTheSameFolder()
    {
        var path = FilePath();
        await File.WriteAllBytesAsync(path, new byte[] { 1 });
        string? tempFolder = null;
        byte[]? targetDuringWrite = null;

        await AtomicFile.WriteAsync(
            path,
            (stream, ct) => stream.WriteAsync(new byte[] { 2 }, ct).AsTask(),
            CancellationToken.None,
            beforeMove: temp =>
            {
                tempFolder = Path.GetDirectoryName(temp);
                targetDuringWrite = File.ReadAllBytes(path);
            });

        Assert.Equal(_dir, tempFolder);
        Assert.Equal(new byte[] { 1 }, targetDuringWrite);
    }

    /// <summary>
    /// A missing writer is refused.
    /// True: a bad call fails where it is made.
    /// False: the first write would fail with a null reference.
    /// </summary>
    [Fact]
    public async Task WriteAsync_WithNoWriter_Throws()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => AtomicFile.WriteAsync(FilePath(), null!, CancellationToken.None));
    }

    /// <summary>
    /// A file is created only when it is absent, and an existing file is left alone.
    /// True: the first caller creates it and the second is told it was already there.
    /// False: a second caller would overwrite the first caller's content.
    /// </summary>
    [Fact]
    public void WriteOnce_CreatesOnlyWhenAbsent()
    {
        var path = FilePath("once.txt");

        var first = AtomicFile.WriteOnce(path, "first");
        var second = AtomicFile.WriteOnce(path, "second");

        Assert.True(first);
        Assert.False(second);
        Assert.Equal("first", File.ReadAllText(path));
        Assert.Equal(new[] { "once.txt" }, Files());
    }

    /// <summary>
    /// The text is written as UTF-8 without a byte order mark.
    /// True: a reader such as ffmpeg gets the exact text.
    /// False: three stray bytes would start the file.
    /// </summary>
    [Fact]
    public void WriteOnce_WritesUtf8WithoutABom()
    {
        var path = FilePath("once.txt");

        AtomicFile.WriteOnce(path, "héllo");

        Assert.Equal(Encoding.UTF8.GetBytes("héllo"), File.ReadAllBytes(path));
    }

    /// <summary>
    /// Many writers racing on one path produce exactly one winner, and the file holds that winner's text.
    /// True: a file named after its content is created once and never half written.
    /// False: two writers would both think they created it, or the file would mix their text.
    /// </summary>
    [Fact]
    public async Task WriteOnce_WhenWritersRace_HasOneWinner()
    {
        var path = FilePath("race.txt");
        using var gate = new ManualResetEventSlim(false);
        var tasks = Enumerable.Range(0, 24)
            .Select(i => Task.Run(() =>
            {
                gate.Wait();
                return (Won: AtomicFile.WriteOnce(path, "writer-" + i), Text: "writer-" + i);
            }))
            .ToArray();

        gate.Set();
        var results = await Task.WhenAll(tasks);

        var winner = Assert.Single(results, r => r.Won);
        Assert.Equal(winner.Text, await File.ReadAllTextAsync(path));
        Assert.Equal(new[] { "race.txt" }, Files());
    }

    /// <summary>
    /// An empty path and a null text are refused.
    /// True: a bad call fails where it is made.
    /// False: a file would be made with no name or no content.
    /// </summary>
    [Fact]
    public void WriteOnce_WithBadArguments_Throws()
    {
        Assert.Throws<ArgumentException>(() => AtomicFile.WriteOnce(string.Empty, "x"));
        Assert.Throws<ArgumentNullException>(() => AtomicFile.WriteOnce(FilePath(), null!));
    }

    /// <summary>
    /// Replacing a file keeps its Unix permissions unless the write is owner only.
    /// True: a file set to 0640 is still 0640 after it is replaced.
    /// False: the new file would get the default mode and widen or narrow the access.
    /// </summary>
    [Fact]
    public void WriteAllBytes_KeepsTheExistingFileMode()
    {
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        var path = FilePath();
        File.WriteAllBytes(path, new byte[] { 1 });
        var mode = UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.GroupRead;
        File.SetUnixFileMode(path, mode);

        AtomicFile.WriteAllBytes(path, new byte[] { 2 });
        Assert.Equal(mode, File.GetUnixFileMode(path));

        AtomicFile.WriteAllBytes(path, new byte[] { 3 }, ownerOnly: true);
        Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
    }

    /// <summary>
    /// A symbolic link at the path is replaced by a regular file and its target is left alone.
    /// True: the write never follows the link.
    /// False: the target of the link would be overwritten.
    /// </summary>
    [Fact]
    public void WriteAllBytes_ReplacesASymbolicLinkAndLeavesItsTarget()
    {
        var target = FilePath("target.bin");
        File.WriteAllBytes(target, new byte[] { 1 });
        var link = FilePath("link.bin");
        try
        {
            File.CreateSymbolicLink(link, target);
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException or IOException or PlatformNotSupportedException)
        {
            return;
        }

        AtomicFile.WriteAllBytes(link, new byte[] { 2 });

        Assert.Null(new FileInfo(link).LinkTarget);
        Assert.Equal(new byte[] { 2 }, File.ReadAllBytes(link));
        Assert.Equal(new byte[] { 1 }, File.ReadAllBytes(target));
    }

    /// <summary>
    /// WriteOnce can create an owner only file.
    /// True: the file is readable by its owner alone.
    /// False: the option would be ignored and the file would be created with the default mode.
    /// </summary>
    [Fact]
    public void WriteOnce_OwnerOnly_CreatesAPrivateFile()
    {
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        var path = FilePath("once.txt");

        Assert.True(AtomicFile.WriteOnce(path, "x", ownerOnly: true));

        Assert.Equal(UnixFileMode.UserRead | UnixFileMode.UserWrite, File.GetUnixFileMode(path));
    }

    /// <summary>
    /// A name too long for the temp file to fit beside it is refused with an ArgumentException, and a name that fits is written.
    /// True: the caller learns the path is the problem, before any write.
    /// False: the failure would come as a path too long error from deep inside the write.
    /// </summary>
    [Fact]
    public async Task TooLongName_ThrowsArgumentException_AndALongButValidNameWorks()
    {
        var tooLong = FilePath(new string('n', 230));

        Assert.Throws<ArgumentException>(() => AtomicFile.WriteAllBytes(tooLong, new byte[1]));
        Assert.Throws<ArgumentException>(() => AtomicFile.WriteOnce(tooLong, "x"));
        await Assert.ThrowsAsync<ArgumentException>(() => AtomicFile.WriteAsync(tooLong, (_, _) => Task.CompletedTask, CancellationToken.None));
        Assert.Empty(Files());

        var fits = FilePath(new string('n', 200));
        AtomicFile.WriteAllBytes(fits, new byte[] { 7 });
        Assert.Equal(new byte[] { 7 }, await File.ReadAllBytesAsync(fits));
    }
}
