namespace JPKribs.Jellyfin.Base;

/// <summary>
/// Byte counts in binary units, so a size limit reads as <c>64 * ByteSize.Megabyte</c> and not as a long number.
/// </summary>
public static class ByteSize
{
    /// <summary>The number of bytes in a kilobyte, which is 1024.</summary>
    public const long Kilobyte = 1024L;

    /// <summary>The number of bytes in a megabyte, which is 1024 kilobytes.</summary>
    public const long Megabyte = Kilobyte * 1024L;

    /// <summary>The number of bytes in a gigabyte, which is 1024 megabytes.</summary>
    public const long Gigabyte = Megabyte * 1024L;
}
