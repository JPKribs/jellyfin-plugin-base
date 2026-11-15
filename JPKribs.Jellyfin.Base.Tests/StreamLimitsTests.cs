using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="StreamLimits.ReadCappedAsync"/> returns a body up to the cap and null past it, without reading an oversize stream to the end.</summary>
public class StreamLimitsTests
{
    private sealed class CountingStream : Stream
    {
        private readonly long _length;
        private long _position;

        public CountingStream(long length) => _length = length;

        public long BytesServed => _position;

        public override bool CanRead => true;

        public override bool CanSeek => false;

        public override bool CanWrite => false;

        public override long Length => throw new NotSupportedException();

        public override long Position
        {
            get => _position;
            set => throw new NotSupportedException();
        }

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        {
            var served = (int)Math.Min(buffer.Length, _length - _position);
            buffer.Span[..served].Fill(7);
            _position += served;
            return new ValueTask<int>(served);
        }

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    private static byte[] Data(int length)
    {
        var data = new byte[length];
        for (var i = 0; i < length; i++)
        {
            data[i] = (byte)(i % 251);
        }

        return data;
    }

    /// <summary>
    /// A stream under the cap, at the cap, and empty is returned whole.
    /// True: a body of exactly the cap is accepted.
    /// False: a correct body would be refused at its last byte.
    /// </summary>
    [Theory]
    [InlineData(0, 10)]
    [InlineData(9, 10)]
    [InlineData(10, 10)]
    [InlineData(200_000, 200_000)]
    public async Task ReadCappedAsync_UpToTheCap_ReturnsTheBytes(int length, int max)
    {
        var data = Data(length);

        var result = await StreamLimits.ReadCappedAsync(new MemoryStream(data), max, CancellationToken.None);

        Assert.Equal(data, result);
    }

    /// <summary>
    /// A stream one byte over the cap gives null.
    /// True: a body larger than the limit is refused.
    /// False: an oversize body would be held in memory.
    /// </summary>
    [Theory]
    [InlineData(11, 10)]
    [InlineData(200_001, 200_000)]
    [InlineData(1, 0)]
    public async Task ReadCappedAsync_PastTheCap_ReturnsNull(int length, int max)
    {
        var result = await StreamLimits.ReadCappedAsync(new MemoryStream(Data(length)), max, CancellationToken.None);

        Assert.Null(result);
    }

    /// <summary>
    /// A stream that cannot report its length stops being read soon after it passes the cap.
    /// True: a hostile body of unbounded size costs a few buffers and not the whole body.
    /// False: the helper would read the stream to its end before it said no.
    /// </summary>
    [Fact]
    public async Task ReadCappedAsync_StopsReadingPastTheCap()
    {
        var stream = new CountingStream(1_000_000_000);

        var result = await StreamLimits.ReadCappedAsync(stream, 100_000, CancellationToken.None);

        Assert.Null(result);
        Assert.True(stream.BytesServed <= 100_000 + 81920);
    }

    /// <summary>
    /// A seekable stream already known to be too long is refused without a read.
    /// True: the position moves not at all.
    /// False: a large file would be read before it was refused.
    /// </summary>
    [Fact]
    public async Task ReadCappedAsync_RefusesASeekableStreamThatIsTooLongUpFront()
    {
        using var stream = new MemoryStream(Data(1000));

        var result = await StreamLimits.ReadCappedAsync(stream, 10, CancellationToken.None);

        Assert.Null(result);
        Assert.Equal(0, stream.Position);
    }

    /// <summary>
    /// Only the bytes after the current position count toward the cap.
    /// True: a stream that was partly read is judged by what is left.
    /// False: bytes that were already read would count against the cap.
    /// </summary>
    [Fact]
    public async Task ReadCappedAsync_CountsFromTheCurrentPosition()
    {
        using var stream = new MemoryStream(Data(20));
        stream.Position = 15;

        var result = await StreamLimits.ReadCappedAsync(stream, 5, CancellationToken.None);

        Assert.Equal(Data(20)[15..], result);
    }

    /// <summary>
    /// The stream is left open for the caller.
    /// True: the caller decides when to dispose it.
    /// False: the helper would close a stream the caller still needs.
    /// </summary>
    [Fact]
    public async Task ReadCappedAsync_LeavesTheStreamOpen()
    {
        using var stream = new MemoryStream(Data(5));

        await StreamLimits.ReadCappedAsync(stream, 10, CancellationToken.None);

        Assert.True(stream.CanRead);
    }

    /// <summary>
    /// A cancelled token, a null stream, and a negative cap are rejected.
    /// True: a cancelled read throws and bad arguments fail at once.
    /// False: a cancelled read would return a part read body.
    /// </summary>
    [Fact]
    public async Task ReadCappedAsync_RejectsCancellationAndBadArguments()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => StreamLimits.ReadCappedAsync(new CountingStream(10), 100, cts.Token));
        await Assert.ThrowsAsync<ArgumentNullException>(() => StreamLimits.ReadCappedAsync(null!, 1, CancellationToken.None));
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => StreamLimits.ReadCappedAsync(new MemoryStream(), -1, CancellationToken.None));
    }

    private sealed class HugeStream : Stream
    {
        public override bool CanRead => true;

        public override bool CanSeek => true;

        public override bool CanWrite => false;

        public override long Length => 3L * 1024 * 1024 * 1024;

        public override long Position { get; set; }

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count) => 0;

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }

    /// <summary>
    /// A limit above what a byte array can hold gives null for a stream longer than an array, and still reads a small one.
    /// True: a huge limit cannot make the reader run out of memory.
    /// False: the length check would pass and the read would try to build an array that cannot exist.
    /// </summary>
    [Fact]
    public async Task ReadCappedAsync_LimitAboveArrayCapacity_ReturnsNullForAHugeStream()
    {
        Assert.Null(await StreamLimits.ReadCappedAsync(new HugeStream(), long.MaxValue, CancellationToken.None));

        var small = await StreamLimits.ReadCappedAsync(new MemoryStream(new byte[] { 1, 2 }), long.MaxValue, CancellationToken.None);
        Assert.Equal(new byte[] { 1, 2 }, small);
    }
}
