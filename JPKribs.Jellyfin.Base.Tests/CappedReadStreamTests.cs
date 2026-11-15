using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="CappedReadStream"/> reads no more than its cap, throws on the read that crosses it, and cannot be seeked or written.</summary>
public class CappedReadStreamTests
{
    /// <summary>
    /// A stream that ends exactly at its cap reads through.
    /// True: a body of the promised size is read in full.
    /// False: a correct body would be refused at its last byte.
    /// </summary>
    [Fact]
    public void Read_UpToTheCap_Succeeds()
    {
        using var capped = new CappedReadStream(new MemoryStream(new byte[10]), 10);
        var buffer = new byte[10];

        var read = capped.Read(buffer, 0, buffer.Length);

        Assert.Equal(10, read);
        Assert.Equal(0, capped.Read(buffer, 0, buffer.Length));
    }

    /// <summary>
    /// A stream that holds more than its cap fails on the read that crosses it.
    /// True: a server sending more than it promised is cut off.
    /// False: a hostile server could fill the disk with a body of any size.
    /// </summary>
    [Fact]
    public void Read_PastTheCap_Throws()
    {
        using var capped = new CappedReadStream(new MemoryStream(new byte[10]), 5);
        var buffer = new byte[5];
        Assert.Equal(5, capped.Read(buffer, 0, buffer.Length));

        Assert.Throws<IOException>(() => capped.Read(buffer, 0, buffer.Length));
    }

    /// <summary>
    /// The async reads count bytes the same way as the sync read.
    /// True: the cap holds for streams copied asynchronously, through either async overload.
    /// False: the cap would be bypassed by every async copy.
    /// </summary>
    [Fact]
    public async Task ReadAsync_PastTheCap_Throws()
    {
        using var capped = new CappedReadStream(new MemoryStream(new byte[10]), 5);
        var buffer = new byte[10];

        await Assert.ThrowsAsync<IOException>(async () => await capped.ReadExactlyAsync(buffer.AsMemory(), CancellationToken.None));
#pragma warning disable CA1835, CA2022 // The array overload is the one under test.
        await Assert.ThrowsAsync<IOException>(async () => await capped.ReadAsync(buffer, 0, buffer.Length, CancellationToken.None));
#pragma warning restore CA1835, CA2022
    }

    /// <summary>
    /// A copy of a body over the cap fails with the I/O error and not with a silent truncation.
    /// True: CopyToAsync from a capped stream throws.
    /// False: a truncated file would be taken for a whole one.
    /// </summary>
    [Fact]
    public async Task CopyToAsync_PastTheCap_Throws()
    {
        using var capped = new CappedReadStream(new MemoryStream(new byte[100]), 50);
        using var destination = new MemoryStream();

        await Assert.ThrowsAsync<IOException>(() => capped.CopyToAsync(destination));
    }

    /// <summary>
    /// The stream is forward only and read only.
    /// True: seeking, measuring, and writing are refused.
    /// False: a caller could read past the cap by seeking back.
    /// </summary>
    [Fact]
    public void Seek_Length_AndWrite_AreNotSupported()
    {
        using var capped = new CappedReadStream(new MemoryStream(new byte[1]), 1);

        Assert.True(capped.CanRead);
        Assert.False(capped.CanSeek);
        Assert.False(capped.CanWrite);
        Assert.Throws<NotSupportedException>(() => capped.Length);
        Assert.Throws<NotSupportedException>(() => capped.Position);
        Assert.Throws<NotSupportedException>(() => capped.Position = 0);
        Assert.Throws<NotSupportedException>(() => capped.Seek(0, SeekOrigin.Begin));
        Assert.Throws<NotSupportedException>(() => capped.SetLength(0));
        Assert.Throws<NotSupportedException>(() => capped.Write(new byte[1], 0, 1));
        capped.Flush();
    }

    /// <summary>
    /// Disposing the wrapper leaves the inner stream open.
    /// True: the caller who made the stream disposes it.
    /// False: the wrapper would close a stream it does not own.
    /// </summary>
    [Fact]
    public void Dispose_LeavesTheInnerStreamOpen()
    {
        using var inner = new MemoryStream(new byte[3]);

        using (var capped = new CappedReadStream(inner, 3))
        {
            Assert.Equal(3, capped.Read(new byte[3], 0, 3));
        }

        Assert.True(inner.CanRead);
    }

    /// <summary>
    /// A missing inner stream and a negative cap are refused.
    /// True: a bad call fails where it is made.
    /// False: the first read would fail with a null reference.
    /// </summary>
    [Fact]
    public void Constructor_WithBadArguments_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => new CappedReadStream(null!, 1));
        Assert.Throws<ArgumentOutOfRangeException>(() => new CappedReadStream(new MemoryStream(), -1));
    }
}
