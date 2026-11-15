using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// Tests that <see cref="StreamUtilities.CopyWithIdleTimeoutAsync"/> fails a copy whose source goes quiet, lets a slow but steady
/// copy finish, reports a cancel as a cancel, and runs another copy, such as the throttled one, under the same watch.
/// </summary>
public class StreamIdleTimeoutTests
{
    /// <summary>
    /// A source that goes quiet part way fails the copy as stalled once the idle time passes, with the bytes before it written.
    /// True: a download from a server that stopped sending ends and can be retried.
    /// False: the copy, and anything waiting on it, hangs forever.
    /// </summary>
    [Fact]
    public async Task CopyWithIdleTimeoutAsync_SourceGoesQuiet_FailsAsStalled()
    {
        using var destination = new MemoryStream();
        using var backstop = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var ex = await Assert.ThrowsAsync<IOException>(
            () => StreamUtilities.CopyWithIdleTimeoutAsync(new QuietAfterPrefix("partial"), destination, TimeSpan.FromMilliseconds(200), cancellationToken: backstop.Token));

        Assert.Contains("stalled", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(backstop.IsCancellationRequested);
        Assert.Equal("partial", Encoding.ASCII.GetString(destination.ToArray()));
    }

    /// <summary>
    /// A source that keeps sending, each gap inside the idle time but the whole copy longer than it, completes.
    /// True: the watch measures silence, not total time.
    /// False: every copy longer than the idle time is cut off.
    /// </summary>
    [Fact]
    public async Task CopyWithIdleTimeoutAsync_SlowButSteady_Completes()
    {
        using var destination = new MemoryStream();

        await StreamUtilities.CopyWithIdleTimeoutAsync(
            new QuietAfterPrefix("img-", trickle: 30, interval: TimeSpan.FromMilliseconds(100)),
            destination,
            TimeSpan.FromSeconds(1),
            cancellationToken: CancellationToken.None);

        Assert.Equal("img-" + new string('t', 30), Encoding.ASCII.GetString(destination.ToArray()));
    }

    /// <summary>
    /// Cancelling the caller's token while the source is quiet cancels, rather than reporting a stall.
    /// True: stopping a task stops it without recording a failure.
    /// False: a cancel is reported as a stalled download.
    /// </summary>
    [Fact]
    public async Task CopyWithIdleTimeoutAsync_CallerCancels_ThrowsCancellation()
    {
        using var destination = new MemoryStream();
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(150));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => StreamUtilities.CopyWithIdleTimeoutAsync(new QuietAfterPrefix("partial"), destination, TimeSpan.FromMinutes(5), cancellationToken: cts.Token));
    }

    /// <summary>
    /// The throttled copy runs under the watch, so one copy both shares a speed limit and fails when its source stalls.
    /// True: throttling and stall detection compose through one call.
    /// False: a caller must pick one, or write its own loop.
    /// </summary>
    [Fact]
    public async Task CopyWithIdleTimeoutAsync_RunsTheThrottledCopy()
    {
        using var destination = new MemoryStream();
        var bucket = new SpeedBucket(1_000_000);

        await StreamUtilities.CopyWithIdleTimeoutAsync(
            new MemoryStream(Encoding.ASCII.GetBytes("throttled")),
            destination,
            TimeSpan.FromSeconds(5),
            (from, to, token) => StreamUtilities.CopyThrottledAsync(from, to, bucket, cancellationToken: token),
            CancellationToken.None);

        Assert.Equal("throttled", Encoding.ASCII.GetString(destination.ToArray()));

        using var stalled = new MemoryStream();
        await Assert.ThrowsAsync<IOException>(() => StreamUtilities.CopyWithIdleTimeoutAsync(
            new QuietAfterPrefix("a"),
            stalled,
            TimeSpan.FromMilliseconds(200),
            (from, to, token) => StreamUtilities.CopyThrottledAsync(from, to, bucket, cancellationToken: token),
            CancellationToken.None));
    }

    /// <summary>
    /// An idle time of zero or less is refused.
    /// True: a caller learns at once that the watch would fire immediately.
    /// False: every copy fails as stalled before its first read.
    /// </summary>
    [Fact]
    public async Task CopyWithIdleTimeoutAsync_ZeroIdleTime_Throws()
    {
        using var destination = new MemoryStream();
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => StreamUtilities.CopyWithIdleTimeoutAsync(new MemoryStream(), destination, TimeSpan.Zero));
        Assert.Equal(TimeSpan.FromMinutes(2), StreamUtilities.DefaultIdleTimeout);
    }

    // Sends its prefix, then nothing until the read is cancelled, or one byte every interval.
    private sealed class QuietAfterPrefix : Stream
    {
        private readonly byte[] _prefix;
        private readonly int _trickle;
        private readonly TimeSpan _interval;
        private int _position;
        private int _sent;

        public QuietAfterPrefix(string prefix, int trickle = 0, TimeSpan interval = default)
        {
            _prefix = Encoding.ASCII.GetBytes(prefix);
            _trickle = trickle;
            _interval = interval;
        }

        public override bool CanRead => true;

        public override bool CanSeek => false;

        public override bool CanWrite => false;

        public override long Length => throw new NotSupportedException();

        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
            => ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            if (_position < _prefix.Length)
            {
                var n = Math.Min(buffer.Length, _prefix.Length - _position);
                _prefix.AsMemory(_position, n).CopyTo(buffer);
                _position += n;
                return n;
            }

            if (_trickle == 0)
            {
                await Task.Delay(Timeout.Infinite, cancellationToken);
            }

            if (_sent < _trickle)
            {
                await Task.Delay(_interval, cancellationToken);
                buffer.Span[0] = (byte)'t';
                _sent++;
                return 1;
            }

            return 0;
        }

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
