# Streams and Throttling

Copying streams at a capped speed, sharing one rate across many streams, and refusing bodies that run past a limit.

A typical download wires four of these together. `RateUtilities` turns a setting in Mbps into bytes per second, a shared `SpeedBucket` holds the rate, `StreamUtilities.CopyThrottledAsync` copies under it, and `CappedReadStream` stops a body that sends more than it promised.

## StreamUtilities

Copies a stream, optionally at a capped speed, and optionally under an idle timeout. `CopyThrottledAsync` is the preferred copy, since several copies can share one `SpeedBucket` and a rate that changes is followed. `CopyWithSpeedLimitAsync` limits one copy on its own. `CopyWithIdleTimeoutAsync` fails a copy whose source stops sending, and runs any other copy under that watch.

```csharp
await StreamUtilities.CopyThrottledAsync(from, to, SharedBucket, () => currentBytesPerSecond, cancellationToken: token).ConfigureAwait(false);
await StreamUtilities.CopyWithSpeedLimitAsync(from, to, speed, token).ConfigureAwait(false);

// A download that shares the speed limit and fails if the server goes quiet for two minutes.
await StreamUtilities.CopyWithIdleTimeoutAsync(
    body,
    file,
    StreamUtilities.DefaultIdleTimeout,
    (from, to, ct) => StreamUtilities.CopyThrottledAsync(from, to, SharedBucket, () => currentBytesPerSecond, cancellationToken: ct),
    token).ConfigureAwait(false);
```

**Gotchas**

* The limit of `CopyWithSpeedLimitAsync` is an average over the whole copy, not per second. After a stall the copy can burst to catch up, and the first block is not delayed. A pause of 10 milliseconds or less is skipped, and a limit of zero or less is a plain copy.
* `CopyThrottledAsync` reads the `rate` function at the start and again after `recheck`, 30 seconds by default. A value above zero is set on the bucket, and zero or less lifts the limit until the next check.
* The bucket decides the burst. A bucket made with no burst holds the copy to its rate from the first block.
* `CopyWithSpeedLimitAsync` does not null-check its arguments, and `CopyThrottledAsync` does. Neither flushes or disposes a stream.
* An `HttpClient` timeout ends once the response headers arrive, so a body that stalls part way hangs a plain copy forever. `CopyWithIdleTimeoutAsync` starts its timer with the copy and again after every read that returns bytes, so it measures silence, not total time.
* A stall fails with an `IOException` whose message starts "The copy stalled.", which `RetryPolicy` treats as transient. A cancel through the caller's token stays an `OperationCanceledException` and is never reported as a stall.
* An idle timeout of zero or less throws `ArgumentOutOfRangeException`. `DefaultIdleTimeout` is two minutes.

## SpeedBucket

A rate in bytes per second that several streams share. A read takes its bytes from the bucket and gets back how long to wait, so the limit is the total across every stream that uses the bucket.

Use one bucket for everything that must share a limit, such as all downloads. Do not make one per stream, since each would get the full rate.

```csharp
private static readonly SpeedBucket Shared = new(RateUtilities.MbpsToBytesPerSecond(80), burstSeconds: 3);

Shared.SetRate(RateUtilities.MbpsToBytesPerSecond(8));
var wait = Shared.Take(bytesJustRead);
if (wait > TimeSpan.Zero) { await Task.Delay(wait, token).ConfigureAwait(false); }
```

**Gotchas**

* The bucket only reports the wait. The caller waits.
* `burstSeconds` must be finite and not negative.
* The default burst is 0, so the bucket holds a stream to its rate from the first byte. Pass `burstSeconds: 3` for a short initial burst. Idle time never banks more than the burst.
* The rate must be above zero. Pass no bucket, or use the `rate` function of `CopyThrottledAsync`, for no limit.
* The clock is a `Func<TimeSpan>` that gives the time since any fixed point, and a test passes its own.

## ThrottledReadStream

A read through stream that holds reads to the rate of a `SpeedBucket`. It stays seekable when the inner stream is, so a response that serves byte ranges from it still can.

Use it to limit what a player or a client reads from a file. It owns the inner stream and disposes it.

```csharp
await using var limited = new ThrottledReadStream(File.OpenRead(path), Shared);
```

**Gotchas**

* A synchronous `Read` sleeps for the wait, so prefer the asynchronous read on a server thread.
* Several streams on one bucket share its rate. The stream cannot be written to.

## CappedReadStream

A read through stream that throws an `IOException` on the read that crosses a limit. Wrap a body from another machine so one that sends more than it promised cannot fill the disk.

```csharp
await using var body = new CappedReadStream(responseStream, 64 * ByteSize.Megabyte);
await body.CopyToAsync(file, token).ConfigureAwait(false);
```

**Gotchas**

* Exactly the limit is accepted. A limit below zero throws.
* It does not own the inner stream and never disposes it. It cannot seek, write, or report a length.
* A copy that fails has already written the bytes before the limit, so write to a temp file, as `AtomicFile.WriteAsync` does.

## ProgressReportingStream

A write through stream that reports the share of the expected bytes written, from 0 to 1, in whole percent steps. Wrap the file a long download writes to, so one transfer moves a task's progress bar.

```csharp
await using var counted = new ProgressReportingStream(file, expectedBytes, progress, alreadyWritten: resumeOffset);
await StreamUtilities.CopyWithIdleTimeoutAsync(body, counted, StreamUtilities.DefaultIdleTimeout, cancellationToken: token).ConfigureAwait(false);
```

**Gotchas**

* It reports at most once per whole percent, so a large copy sends about a hundred reports, not one per buffer.
* The share never passes 1, since the expected size can be out of date.
* `alreadyWritten` starts the count at the bytes already on disk, for a resumed download.
* An expected size of zero or less, or a negative `alreadyWritten`, throws `ArgumentOutOfRangeException`.
* It does not own the inner stream and never disposes it. It cannot read or seek.

## StreamLimits

Reads a stream into memory with a size limit and returns null when the stream holds more.

```csharp
var bytes = await StreamLimits.ReadCappedAsync(await content.ReadAsStreamAsync(token), 1 * ByteSize.Megabyte, token).ConfigureAwait(false);
if (bytes is null) { return TooLarge(); }
```

**Gotchas**

* Exactly the limit is accepted. A seekable stream that is already too long is refused without a read, and any other stream stops being read soon after it passes the limit.
* A limit above what a byte array can hold (`Array.MaxLength`) counts as that, and a longer stream gives null.
* The stream is read from its current position and is not disposed. A failed or cancelled read throws, and only an oversize body gives null.

## ByteSize

Three `long` constants for binary sizes, `Kilobyte`, `Megabyte`, and `Gigabyte`, each 1024 times the one before. Use them for a size limit.

```csharp
var limit = 64 * ByteSize.Megabyte;
```

**Gotchas**

* They are `long`, so a multiple does not overflow an `int`.

## RateUtilities

Speeds are kept in Mbps, the way video bitrates are, and converted to bytes per second for a throttle.

```csharp
public long GetMaxDownloadSpeedBytes() => RateUtilities.MbpsToBytesPerSecond(MaxDownloadSpeed);

// Moving an older "10 MB per second" setting to Mbps:
MaxDownloadSpeed = RateUtilities.ToMbps(MaxDownloadSpeed, DownloadSpeedUnit);
```

**Gotchas**

* `MbpsToBytesPerSecond` returns 0 for zero or less, which means no limit. 40 gives 5,000,000.
* `ToMbps` converts an older speed in binary KB, MB, or GB per second. It rounds up and returns at least 1 for a positive value, so a limit never becomes "no limit". 10 MB gives 84.
* The unit is case-insensitive. A value already in `Mbps` is returned as it is. A null or unknown unit counts as MB, and the result is capped at `int.MaxValue`.
