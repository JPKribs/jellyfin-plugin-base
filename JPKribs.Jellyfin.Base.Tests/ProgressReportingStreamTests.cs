using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Xunit;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>
/// The progress stream reports bytes written as a fraction of the expected size, in whole percent steps.
/// </summary>
public class ProgressReportingStreamTests
{
    private sealed class CapturingProgress : IProgress<double>
    {
        public List<double> Reports { get; } = new();

        public void Report(double value) => Reports.Add(value);
    }

    /// <summary>
    /// Written bytes surface as a fraction of the expected total.
    /// True: a long download moves the task's bar as bytes land.
    /// False: the bar freezes for the entire file.
    /// </summary>
    [Fact]
    public async Task Write_ReportsFractionOfExpected()
    {
        var captured = new CapturingProgress();
        using var inner = new MemoryStream();
        var stream = new ProgressReportingStream(inner, expectedBytes: 1000, captured);

        await stream.WriteAsync(new byte[500]);

        Assert.Contains(captured.Reports, r => Math.Abs(r - 0.5) < 0.001);
    }

    /// <summary>
    /// Reports are throttled to whole-percent steps.
    /// True: a 50 GB copy emits at most ~100 reports, not one per buffer.
    /// False: hundreds of thousands of per-buffer reports hammer Jellyfin's
    /// task-progress plumbing.
    /// </summary>
    [Fact]
    public void Write_ThrottlesToWholePercentSteps()
    {
        var captured = new CapturingProgress();
        using var inner = new MemoryStream();
        var stream = new ProgressReportingStream(inner, expectedBytes: 100_000, captured);

        // 1000 writes of 100 bytes = 100k bytes = 100%.
        for (var i = 0; i < 1000; i++)
        {
            stream.Write(new byte[100], 0, 100);
        }

        Assert.InRange(captured.Reports.Count, 1, 101);
        Assert.Equal(1.0, captured.Reports[^1], 3);
    }

    /// <summary>
    /// Overshoot past the expected size (a stale expected size)
    /// clamps at 1 instead of reporting an impossible fraction.
    /// </summary>
    [Fact]
    public void Write_PastExpected_ClampsAtOne()
    {
        var captured = new CapturingProgress();
        using var inner = new MemoryStream();
        var stream = new ProgressReportingStream(inner, expectedBytes: 100, captured);

        stream.Write(new byte[250], 0, 250);

        Assert.All(captured.Reports, r => Assert.InRange(r, 0, 1));
        Assert.Equal(1.0, captured.Reports[^1], 3);
    }

    /// <summary>
    /// Bytes pass through to the destination unchanged, the wrapper is
    /// observability only.
    /// </summary>
    [Fact]
    public async Task Write_PassesBytesThrough()
    {
        var captured = new CapturingProgress();
        using var inner = new MemoryStream();
        var stream = new ProgressReportingStream(inner, expectedBytes: 4, captured);

        await stream.WriteAsync(new byte[] { 1, 2, 3, 4 });

        Assert.Equal(new byte[] { 1, 2, 3, 4 }, inner.ToArray());
    }

    /// <summary>
    /// A resumed download counts the bytes already in place, so progress starts where it left off.
    /// True: a resume shows the bar at its real position.
    /// False: a resumed download restarts the bar at zero and ends past one.
    /// </summary>
    [Fact]
    public void Write_AfterResume_CountsBytesAlreadyWritten()
    {
        var captured = new CapturingProgress();
        using var inner = new MemoryStream();
        var stream = new ProgressReportingStream(inner, expectedBytes: 1000, captured, alreadyWritten: 600);

        stream.Write(new byte[100], 0, 100);

        Assert.Equal(0.7, captured.Reports[^1], 3);
    }

    /// <summary>
    /// An expected size of zero or a negative resume offset is refused.
    /// True: a caller learns at once that the fraction cannot be computed.
    /// False: progress would divide by zero or start below zero.
    /// </summary>
    [Fact]
    public void Constructor_BadSizes_Throw()
    {
        using var inner = new MemoryStream();
        var captured = new CapturingProgress();
        Assert.Throws<ArgumentOutOfRangeException>(() => new ProgressReportingStream(inner, 0, captured));
        Assert.Throws<ArgumentOutOfRangeException>(() => new ProgressReportingStream(inner, 10, captured, alreadyWritten: -1));
    }
}
