using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="ByteSize"/> holds the binary byte counts, each 1024 times the one before.</summary>
public class ByteSizeTests
{
    /// <summary>
    /// The constants are 1024 based and are long values.
    /// True: a limit of 64 megabytes is 67,108,864 bytes and a gigabyte does not overflow an int.
    /// False: a constant would be decimal, or would overflow when multiplied.
    /// </summary>
    [Fact]
    public void Constants_AreBinaryAndLong()
    {
        Assert.Equal(1024L, ByteSize.Kilobyte);
        Assert.Equal(1_048_576L, ByteSize.Megabyte);
        Assert.Equal(1_073_741_824L, ByteSize.Gigabyte);
        Assert.Equal(67_108_864L, 64 * ByteSize.Megabyte);
        Assert.Equal(4_294_967_296L, 4 * ByteSize.Gigabyte);
    }
}
