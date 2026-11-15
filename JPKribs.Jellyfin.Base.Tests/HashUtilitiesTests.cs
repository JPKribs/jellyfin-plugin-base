using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>Verifies that <see cref="HashUtilities"/> gives the same lowercase hex fingerprints of the SHA-256 of its input as it always has, and pins each overload to known outputs.</summary>
public class HashUtilitiesTests
{
    /// <summary>
    /// The fingerprint is the first 16 bytes of the SHA-256 of the UTF-8 text, in lowercase hex.
    /// True: the same text gives the same fingerprint in every plugin.
    /// False: the fingerprint would change with the hash or the encoding.
    /// </summary>
    [Theory]
    [InlineData("", "e3b0c44298fc1c149afbf4c8996fb924")]
    [InlineData("abc", "ba7816bf8f01cfea414140de5dae2223")]
    public void ComputeSha256Hash_MatchesKnownVectors(string input, string expected)
    {
        var hash = HashUtilities.ComputeSha256Hash(input);

        Assert.Equal(32, hash.Length);
        Assert.Equal(expected, hash);
    }

    /// <summary>
    /// The same text always gives the same fingerprint.
    /// True: a fingerprint can be compared across runs.
    /// False: the fingerprint would vary between calls.
    /// </summary>
    [Fact]
    public void ComputeSha256Hash_IsDeterministic()
        => Assert.Equal(HashUtilities.ComputeSha256Hash("payload"), HashUtilities.ComputeSha256Hash("payload"));

    /// <summary>
    /// A null string counts as empty.
    /// True: a missing value has the fingerprint of an empty one.
    /// False: a null would throw.
    /// </summary>
    [Fact]
    public void ComputeSha256Hash_NullCountsAsEmpty()
        => Assert.Equal("e3b0c44298fc1c149afbf4c8996fb924", HashUtilities.ComputeSha256Hash((string?)null));

    /// <summary>
    /// A stream gives the same fingerprint as its text, and is left open.
    /// True: a file and its content hash alike, and the caller can still use the stream.
    /// False: the two overloads would disagree or the stream would be disposed.
    /// </summary>
    [Fact]
    public void ComputeSha256Hash_OfAStreamMatchesTheTextAndLeavesItOpen()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("abc"));

        var hash = HashUtilities.ComputeSha256Hash(stream);

        Assert.Equal("ba7816bf8f01cfea414140de5dae2223", hash);
        Assert.True(stream.CanRead);
    }

    private static string SyncHash(byte[] data) => HashUtilities.ComputeSha256Hash(new MemoryStream(data));

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
    /// The string fingerprint is pinned to known outputs for text, accented text, other scripts, and a character outside the basic plane.
    /// True: the same text gives these exact 32 characters in every plugin and every release.
    /// False: a change of hash, encoding, or case would change stored fingerprints.
    /// </summary>
    [Theory]
    [InlineData("", "e3b0c44298fc1c149afbf4c8996fb924")]
    [InlineData("abc", "ba7816bf8f01cfea414140de5dae2223")]
    [InlineData("h\u00e9llo", "3c48591d8d098a4538f5e013dfcf406e")]
    [InlineData("The quick brown fox jumps over the lazy dog", "d7a8fbb307d7809469ca9abcb0082e4f")]
    [InlineData("\u65e5\u672c\u8a9e", "77710aedc74ecfa33685e33a6c7df5cc")]
    [InlineData("\U0001F600", "f0443a342c5ef54783a111b51ba56c93")]
    public void ComputeSha256Hash_OfAString_IsPinned(string input, string expected)
    {
        Assert.Equal(expected, HashUtilities.ComputeSha256Hash(input));
    }

    /// <summary>
    /// The stream fingerprint is pinned for an empty stream, a short one, and one that spans several buffers.
    /// True: a file hashes to these exact 32 characters.
    /// False: a change in how the stream is read would change stored fingerprints.
    /// </summary>
    [Fact]
    public void ComputeSha256Hash_OfAStream_IsPinned()
    {
        Assert.Equal("e3b0c44298fc1c149afbf4c8996fb924", HashUtilities.ComputeSha256Hash(new MemoryStream()));
        Assert.Equal("ba7816bf8f01cfea414140de5dae2223", HashUtilities.ComputeSha256Hash(new MemoryStream(Encoding.UTF8.GetBytes("abc"))));
        Assert.Equal("e24bc62381f1224fbbb74688663f8f97", HashUtilities.ComputeSha256Hash(new MemoryStream(Data(200_000))));
    }

    /// <summary>
    /// The full digest is pinned for the same inputs, in lowercase.
    /// True: Sha256Hex gives the standard SHA-256 digest.
    /// False: the digest would differ from every other SHA-256 tool.
    /// </summary>
    [Theory]
    [InlineData("", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")]
    [InlineData("abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")]
    [InlineData("h\u00e9llo", "3c48591d8d098a4538f5e013dfcf406e948eac4d3277b10bf614e295d6068179")]
    [InlineData("The quick brown fox jumps over the lazy dog", "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592")]
    [InlineData("\U0001F600", "f0443a342c5ef54783a111b51ba56c938e474c32324d90c3a60c9c8e3a37e2d9")]
    public void Sha256Hex_GivesTheFullLowercaseDigest(string input, string expected)
    {
        Assert.Equal(expected, HashUtilities.Sha256Hex(input));
        Assert.Equal(expected, HashUtilities.Sha256Hex(input, 64));
    }

    /// <summary>
    /// A shorter length returns the leading characters of the same digest.
    /// True: a length of 32 equals the string fingerprint and a length of 1 is the first character.
    /// False: the cut would take other characters than the leading ones.
    /// </summary>
    [Theory]
    [InlineData(1, "b")]
    [InlineData(8, "ba7816bf")]
    [InlineData(32, "ba7816bf8f01cfea414140de5dae2223")]
    [InlineData(63, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015a")]
    public void Sha256Hex_CutsToTheLeadingCharacters(int length, string expected)
    {
        Assert.Equal(expected, HashUtilities.Sha256Hex("abc", length));
        Assert.Equal(length, HashUtilities.Sha256Hex("abc", length).Length);
    }

    /// <summary>
    /// A null string counts as empty, and a length outside 1 to 64 is refused.
    /// True: a missing value has the digest of an empty one and a bad length fails at once.
    /// False: a null would throw, or a length of zero or 65 would return a wrong digest.
    /// </summary>
    [Fact]
    public void Sha256Hex_HandlesNullAndBadLengths()
    {
        Assert.Equal("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", HashUtilities.Sha256Hex(null));
        Assert.Throws<ArgumentOutOfRangeException>(() => HashUtilities.Sha256Hex("abc", 0));
        Assert.Throws<ArgumentOutOfRangeException>(() => HashUtilities.Sha256Hex("abc", 65));
        Assert.Throws<ArgumentOutOfRangeException>(() => HashUtilities.Sha256Hex("abc", -1));
    }

    /// <summary>
    /// The async stream hash equals the synchronous one and counts the bytes read.
    /// True: a download can be hashed and measured in one pass with the same fingerprint as before.
    /// False: the two overloads would disagree, or the length would be wrong.
    /// </summary>
    [Theory]
    [InlineData(0, "e3b0c44298fc1c149afbf4c8996fb924")]
    [InlineData(3, null)]
    [InlineData(81_920, null)]
    [InlineData(100_000, "cd2df694e424bc7968cc37f47751019e")]
    [InlineData(200_000, "e24bc62381f1224fbbb74688663f8f97")]
    public async Task ComputeSha256HashAsync_MatchesTheSyncHashAndCountsBytes(int length, string? pinned)
    {
        var data = Data(length);

        var (hash, counted) = await HashUtilities.ComputeSha256HashAsync(new MemoryStream(data), CancellationToken.None);

        Assert.Equal(length, counted);
        Assert.Equal(SyncHash(data), hash);
        Assert.Equal(32, hash.Length);
        Assert.Equal(hash.ToLowerInvariant(), hash);
        if (pinned is not null)
        {
            Assert.Equal(pinned, hash);
        }
    }

    /// <summary>
    /// The async hash starts at the stream's current position and leaves the stream open.
    /// True: only the unread bytes are hashed and counted.
    /// False: bytes already read would be hashed, or the stream would be closed.
    /// </summary>
    [Fact]
    public async Task ComputeSha256HashAsync_StartsAtTheCurrentPositionAndLeavesTheStreamOpen()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("xxabc"));
        stream.Position = 2;

        var (hash, length) = await HashUtilities.ComputeSha256HashAsync(stream);

        Assert.Equal("ba7816bf8f01cfea414140de5dae2223", hash);
        Assert.Equal(3, length);
        Assert.True(stream.CanRead);
    }

    /// <summary>
    /// A cancelled token and a null stream are rejected.
    /// True: a cancelled hash throws and a bad call fails at once.
    /// False: a cancelled hash would return a fingerprint of part of the stream.
    /// </summary>
    [Fact]
    public async Task ComputeSha256HashAsync_RejectsCancellationAndNull()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => HashUtilities.ComputeSha256HashAsync(new MemoryStream(new byte[10]), cts.Token));
        await Assert.ThrowsAsync<ArgumentNullException>(() => HashUtilities.ComputeSha256HashAsync(null!));
    }
}
