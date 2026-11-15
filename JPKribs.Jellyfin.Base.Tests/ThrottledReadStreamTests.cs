using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ThrottledReadStream"/> reads the same bytes as its inner stream, waits as its bucket says, and stays seekable.</summary>
public class ThrottledReadStreamTests
{
    private static (ThrottledReadStream Stream, List<TimeSpan> Waits) Build(byte[] data, SpeedBucket bucket)
    {
        var waits = new List<TimeSpan>();
        var stream = new ThrottledReadStream(
            new MemoryStream(data),
            bucket,
            (wait, _) =>
            {
                waits.Add(wait);
                return Task.CompletedTask;
            },
            waits.Add);
        return (stream, waits);
    }

    /// <summary>
    /// The wrapper reads the same bytes as the inner stream, and stays seekable for byte ranges.
    /// True: a limited stream still serves seeks and sends the file unchanged.
    /// False: a speed limit would break seeking or corrupt what is sent.
    /// </summary>
    [Fact]
    public async Task Stream_ReadsTheSameBytes_AndSeeks()
    {
        var data = new byte[5000];
        Random.Shared.NextBytes(data);
        await using var stream = new ThrottledReadStream(new MemoryStream(data), new SpeedBucket(1_000_000));

        Assert.True(stream.CanRead);
        Assert.True(stream.CanSeek);
        Assert.False(stream.CanWrite);
        Assert.Equal(data.Length, stream.Length);
        stream.Seek(1000, SeekOrigin.Begin);
        Assert.Equal(1000, stream.Position);
        var read = new byte[4000];
        await stream.ReadExactlyAsync(read);

        Assert.Equal(data[1000..], read);
    }

    /// <summary>
    /// A read inside the burst does not wait, and a read past it waits for the debt.
    /// True: the player's first buffer arrives at once and later reads settle at the rate.
    /// False: the limit would never apply or would slow the start of every play.
    /// </summary>
    [Fact]
    public async Task ReadAsync_WaitsOnlyPastTheBurst()
    {
        var clock = TimeSpan.Zero;
        var bucket = new SpeedBucket(100, 3, () => clock);
        var (stream, waits) = Build(new byte[1000], bucket);
        using (stream)
        {
            var buffer = new byte[300];
            Assert.Equal(300, await stream.ReadAsync(buffer.AsMemory()));
            Assert.Empty(waits);

            Assert.Equal(300, await stream.ReadAsync(buffer.AsMemory()));
            Assert.Equal(new[] { TimeSpan.FromSeconds(3) }, waits);
        }
    }

    /// <summary>
    /// The array overload of the async read waits the same way as the memory overload.
    /// True: a caller using the older signature is limited too.
    /// False: the older overload would skip the limit.
    /// </summary>
    [Fact]
    public async Task ReadAsync_WithAnArray_WaitsToo()
    {
        var bucket = new SpeedBucket(100, 0, () => TimeSpan.Zero);
        var (stream, waits) = Build(new byte[500], bucket);
        using (stream)
        {
#pragma warning disable CA1835 // The array overload is the one under test.
            var read = await stream.ReadAsync(new byte[100], 0, 100, CancellationToken.None);
#pragma warning restore CA1835

            Assert.Equal(100, read);
            Assert.Equal(new[] { TimeSpan.FromSeconds(1) }, waits);
        }
    }

    /// <summary>
    /// A synchronous read sleeps for the wait.
    /// True: a blocking reader is limited too.
    /// False: the synchronous read would skip the limit.
    /// </summary>
    [Fact]
    public void Read_SleepsForTheWait()
    {
        var bucket = new SpeedBucket(100, 0, () => TimeSpan.Zero);
        var (stream, waits) = Build(new byte[500], bucket);
        using (stream)
        {
            var read = stream.Read(new byte[100], 0, 100);

            Assert.Equal(100, read);
            Assert.Equal(new[] { TimeSpan.FromSeconds(1) }, waits);
        }
    }

    /// <summary>
    /// Two streams that share a bucket share its rate.
    /// True: the second stream waits for the debt the first one left.
    /// False: each stream would get the full rate and the limit would double.
    /// </summary>
    [Fact]
    public async Task TwoStreams_ShareOneBucket()
    {
        var bucket = new SpeedBucket(100, 0, () => TimeSpan.Zero);
        var (first, firstWaits) = Build(new byte[500], bucket);
        var (second, secondWaits) = Build(new byte[500], bucket);
        using (first)
        using (second)
        {
            await first.ReadExactlyAsync(new byte[100].AsMemory());
            await second.ReadExactlyAsync(new byte[100].AsMemory());

            Assert.Equal(new[] { TimeSpan.FromSeconds(1) }, firstWaits);
            Assert.Equal(new[] { TimeSpan.FromSeconds(2) }, secondWaits);
        }
    }

    /// <summary>
    /// The end of the stream reads zero bytes and waits for nothing.
    /// True: a finished stream does not stall.
    /// False: the last read would wait for a debt it did not incur.
    /// </summary>
    [Fact]
    public async Task ReadAsync_AtTheEnd_ReadsZeroWithoutWaiting()
    {
        var bucket = new SpeedBucket(100, 0, () => TimeSpan.Zero);
        var (stream, waits) = Build(Array.Empty<byte>(), bucket);
        using (stream)
        {
            Assert.Equal(0, await stream.ReadAsync(new byte[10].AsMemory()));
            Assert.Empty(waits);
        }
    }

    /// <summary>
    /// Disposing the wrapper asynchronously disposes the inner stream.
    /// True: the wrapper owns what it wraps.
    /// False: a file handle would leak.
    /// </summary>
    [Fact]
    public async Task DisposeAsync_DisposesTheInnerStream()
    {
        var innerAsync = new MemoryStream(new byte[1]);
        await new ThrottledReadStream(innerAsync, new SpeedBucket(100)).DisposeAsync();
        Assert.False(innerAsync.CanRead);
    }

    /// <summary>
    /// Disposing the wrapper disposes the inner stream.
    /// True: the wrapper owns what it wraps.
    /// False: a file handle would leak.
    /// </summary>
    [Fact]
    public void Dispose_DisposesTheInnerStream()
    {
        var inner = new MemoryStream(new byte[1]);

        new ThrottledReadStream(inner, new SpeedBucket(100)).Dispose();

        Assert.False(inner.CanRead);
    }

    /// <summary>
    /// The stream cannot be written or resized, and missing arguments are refused.
    /// True: a read only wrapper stays read only.
    /// False: a write would reach the inner stream.
    /// </summary>
    [Fact]
    public void WriteAndSetLength_AreNotSupported_AndArgumentsAreChecked()
    {
        using var stream = new ThrottledReadStream(new MemoryStream(new byte[1]), new SpeedBucket(100));

        Assert.Throws<NotSupportedException>(() => stream.Write(new byte[1], 0, 1));
        Assert.Throws<NotSupportedException>(() => stream.SetLength(0));
        stream.Flush();
        Assert.Throws<ArgumentNullException>(() => new ThrottledReadStream(null!, new SpeedBucket(100)));
        Assert.Throws<ArgumentNullException>(() => new ThrottledReadStream(new MemoryStream(), null!));
    }

    private sealed class CountingStream : MemoryStream
    {
        public int Disposals { get; private set; }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                Disposals++;
            }

            base.Dispose(disposing);
        }
    }

    /// <summary>
    /// Disposing the wrapper asynchronously, even twice, disposes the inner stream once.
    /// True: the inner stream sees one dispose.
    /// False: the async dispose would dispose the inner stream a second time through the base class.
    /// </summary>
    [Fact]
    public async Task DisposeAsync_DisposesTheInnerStreamOnce()
    {
        var inner = new CountingStream();
        var stream = new ThrottledReadStream(inner, new SpeedBucket(100));

        await stream.DisposeAsync();
        await stream.DisposeAsync();

        Assert.Equal(1, inner.Disposals);
    }

    /// <summary>
    /// Disposing the wrapper twice disposes the inner stream once.
    /// True: the inner stream sees one dispose.
    /// False: each call would dispose the inner stream again.
    /// </summary>
    [Fact]
    public void Dispose_DisposesTheInnerStreamOnce()
    {
        var syncInner = new CountingStream();
        var other = new ThrottledReadStream(syncInner, new SpeedBucket(100));
        other.Dispose();
        other.Dispose();
        Assert.Equal(1, syncInner.Disposals);
    }
}
