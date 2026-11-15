using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Writes a file so a reader sees the old content or the new content and never half of it.
/// The data goes to a temp file in the same folder, reaches the disk, and is then moved over the target.
/// </summary>
/// <remarks>
/// The temp file is named after the target with a guid and ".tmp" added, so two writers never share one, and it is removed when the write fails.
/// The folder must already exist, since a missing folder is not created. A move is atomic only inside one volume, which is why the temp file sits beside the target.
/// A symbolic link at the path is replaced by the new file and its target is left as it was.
/// When the temp name would be too long for the file system, which is a file name over 255 bytes or a full path over the OS limit, the call throws <see cref="ArgumentException"/> before it writes anything.
/// </remarks>
public static class AtomicFile
{
    private const int MaxNameLength = 255;

    private static readonly UTF8Encoding Utf8NoBom = new(false);

    private static readonly object OnceLock = new();

    /// <summary>
    /// Replaces a file with the given bytes, or creates it.
    /// A failure leaves the old file as it was.
    /// </summary>
    /// <remarks>
    /// With <paramref name="ownerOnly"/> the temp file is created readable by its owner alone on Linux and macOS, so there is no moment when it is wider, and the move keeps that.
    /// Without it, an existing file's Unix permissions are copied to the new file, so replacing a file does not change its mode.
    /// It has no effect on Windows, where <paramref name="beforeMove"/> can set the access rules.
    /// An I/O failure is not caught, and the temp file is removed before it propagates.
    /// </remarks>
    /// <param name="path">The file to write.</param>
    /// <param name="data">The new content.</param>
    /// <param name="flushToDisk">Whether to flush the data to the disk before the move, so a power loss cannot leave an empty file. <c>true</c> by default.</param>
    /// <param name="ownerOnly">Whether the file is private to its owner on Linux and macOS. <c>false</c> by default.</param>
    /// <param name="beforeMove">An optional action that receives the temp file path after the data is written, such as to set the access rules.</param>
    /// <param name="logger">An optional logger that reports a temp file that could not be removed.</param>
    public static void WriteAllBytes(
        string path,
        ReadOnlySpan<byte> data,
        bool flushToDisk = true,
        bool ownerOnly = false,
        Action<string>? beforeMove = null,
        ILogger? logger = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);

        var temp = TempPathFor(path);
        try
        {
            using (var stream = CreateTemp(temp, ownerOnly))
            {
                stream.Write(data);
                if (flushToDisk)
                {
                    stream.Flush(flushToDisk: true);
                }
            }

            KeepMode(temp, path, ownerOnly);
            beforeMove?.Invoke(temp);
            File.Move(temp, path, overwrite: true);
        }
        catch
        {
            TryDeleteTemp(temp, logger);
            throw;
        }
    }

    /// <summary>
    /// Replaces a file with whatever <paramref name="write"/> writes to a stream, or creates it.
    /// A failure or a cancellation leaves the old file as it was.
    /// </summary>
    /// <remarks>
    /// The stream is the temp file and is closed after <paramref name="write"/> returns, so the writer must not dispose it or keep it.
    /// See <see cref="WriteAllBytes"/> for the temp file and the flush.
    /// </remarks>
    /// <param name="path">The file to write.</param>
    /// <param name="write">The writer, which receives the temp file's stream and the cancellation token.</param>
    /// <param name="cancellationToken">The cancellation token, which stops the write and removes the temp file.</param>
    /// <param name="flushToDisk">Whether to flush the data to the disk before the move. <c>true</c> by default.</param>
    /// <param name="ownerOnly">Whether the file is private to its owner on Linux and macOS. <c>false</c> by default.</param>
    /// <param name="beforeMove">An optional action that receives the temp file path after the data is written.</param>
    /// <param name="logger">An optional logger that reports a temp file that could not be removed.</param>
    /// <returns>A task that completes when the file is in place.</returns>
    public static async Task WriteAsync(
        string path,
        Func<Stream, CancellationToken, Task> write,
        CancellationToken cancellationToken,
        bool flushToDisk = true,
        bool ownerOnly = false,
        Action<string>? beforeMove = null,
        ILogger? logger = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        ArgumentNullException.ThrowIfNull(write);

        var temp = TempPathFor(path);
        try
        {
            var stream = CreateTemp(temp, ownerOnly);
            await using (stream.ConfigureAwait(false))
            {
                await write(stream, cancellationToken).ConfigureAwait(false);
                await stream.FlushAsync(cancellationToken).ConfigureAwait(false);
                if (flushToDisk)
                {
                    RandomAccess.FlushToDisk(stream.SafeFileHandle);
                }
            }

            KeepMode(temp, path, ownerOnly);
            beforeMove?.Invoke(temp);
            File.Move(temp, path, overwrite: true);
        }
        catch
        {
            TryDeleteTemp(temp, logger);
            throw;
        }
    }

    /// <summary>
    /// Creates a file with the given text only when no file is there yet, and says whether it did.
    /// Several writers racing on one path produce exactly one winner.
    /// </summary>
    /// <remarks>
    /// The text is written as UTF-8 without a byte order mark, and an existing file is never touched.
    /// A reader that opens the path sees the whole text or no file. The single winner is guaranteed among writers in one process, and a second process racing on the same path can still replace the file on Unix.
    /// </remarks>
    /// <param name="path">The file to create.</param>
    /// <param name="text">The text to write.</param>
    /// <param name="ownerOnly">Whether the file is private to its owner on Linux and macOS. <c>false</c> by default.</param>
    /// <returns><c>true</c> when this call created the file, <c>false</c> when it was already there.</returns>
    public static bool WriteOnce(string path, string text, bool ownerOnly = false)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        ArgumentNullException.ThrowIfNull(text);

        if (File.Exists(path))
        {
            return false;
        }

        var temp = TempPathFor(path);
        try
        {
            using (var stream = CreateTemp(temp, ownerOnly))
            {
                stream.Write(Utf8NoBom.GetBytes(text));
                stream.Flush(flushToDisk: true);
            }

            // On Unix a move without overwrite is a check then a rename, so two writers could both pass it. The lock makes one win within this process.
            lock (OnceLock)
            {
                if (File.Exists(path))
                {
                    return false;
                }

                File.Move(temp, path, overwrite: false);
            }

            return true;
        }
        catch (IOException) when (File.Exists(path))
        {
            // Another writer moved its file into place first.
            return false;
        }
        finally
        {
            TryDeleteTemp(temp, null);
        }
    }

    private static string TempPathFor(string path)
    {
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        var name = Path.GetFileName(temp);
        var nameLength = OperatingSystem.IsWindows() ? name.Length : Encoding.UTF8.GetByteCount(name);
        var pathLimit = OperatingSystem.IsWindows() ? 32767 : OperatingSystem.IsMacOS() ? 1024 : 4096;
        if (nameLength > MaxNameLength || temp.Length >= pathLimit)
        {
            throw new ArgumentException("The path is too long for the temp file written beside it, which adds 37 characters to the file name.", nameof(path));
        }

        return temp;
    }

    // The old file's permissions carry over, unless the caller asked for owner only. A caller's beforeMove runs after and can still change them.
    private static void KeepMode(string temp, string path, bool ownerOnly)
    {
        if (ownerOnly || OperatingSystem.IsWindows())
        {
            return;
        }

        try
        {
            File.SetUnixFileMode(temp, File.GetUnixFileMode(path));
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            // There is no old file, so the new file keeps the default mode.
        }
    }

    private static FileStream CreateTemp(string temp, bool ownerOnly)
    {
        var options = new FileStreamOptions
        {
            Mode = FileMode.CreateNew,
            Access = FileAccess.Write,
            Share = FileShare.None
        };

        if (ownerOnly && !OperatingSystem.IsWindows())
        {
            options.UnixCreateMode = UnixFileMode.UserRead | UnixFileMode.UserWrite;
        }

        return new FileStream(temp, options);
    }

    private static void TryDeleteTemp(string temp, ILogger? logger)
    {
        try
        {
            File.Delete(temp);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            logger?.LogWarning(ex, "Could not remove the temp file {Path}.", temp);
        }
    }
}
