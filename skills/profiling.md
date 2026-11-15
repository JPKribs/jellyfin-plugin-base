# Profiling

How to find and fix slow C# in Base. It covers CPU, memory, allocations, locks, file I/O, and HTTP in the helpers under `src/*.cs`. Every other language is out of scope, including the CSS and JS.

Base has no running server. Its helpers run inside each plugin, inside Jellyfin. So Tier 1 times a helper in the test project, and deeper tiers trace the test host or a plugin that uses the helper.

## When to Profile

Profile only when there is a reason. Never profile to look for something to improve.

Start when one of these is true.

* A plugin author or a test reports that a helper is slow, uses too much memory, or starves playback.
* A change adds or alters a loop, a copy, a parse, or a lock in a helper that plugins call for every item, such as `ConcurrentTaskRunner`, `ActivitySummary`, `JsonFileStore`, `JpkHttp`, `StreamUtilities`, `FileNameSanitizer`, `SecretProtector`, or `DatabaseSchema`.
* A number in a timing test grew from one release to the next.

Without one of these, do not profile. Code that has no symptom and no change is not a problem.

## The Tiers

Profiling has three tiers. Start at Tier 1. Go up a tier only when the one below could not answer the question. Most issues end at Tier 1.

| Tier | Answers | Budget | Needs a plugin |
| :--- | :--- | :--- | :--- |
| 1. Time One Helper | Is this code slow by itself | 10 minutes | No |
| 2. Trace One Path | Which code dominates one slow call in the test host or in a plugin's task | 30 minutes | Sometimes |
| 3. Go Deeper | Why memory grows, or what a second path costs | Ask first | Yes |

* **Tier 1** is a temporary timing test in `JPKribs.Jellyfin.Base.Tests/`. It needs no server and no seed.
* **Tier 2** is one CPU trace and counters, taken with `dotnet-trace` and `dotnet-counters`. Trace the test host while a looping test runs. When the cost only shows with a plugin's data, trace that plugin's scheduled task or route in a Jellyfin server that runs it. Pick the one path the issue points at.
* **Tier 3** is a heap dump, a second path, or a plugin at a larger scale. Stop and ask before you start it.

### The Budget

* Each tier has a time budget. When it runs out, stop and report what you have, even when it is inconclusive.
* Profile one path per issue. Never sweep every helper "to be sure".
* Stop as soon as the goal is met or the cause is proven.
* Write the tier, the path, and the stop reason in the report.

## The Rule

Measure first, change second, measure again. A change made for speed is not done until a number shows it is faster and the tests still pass.

* Never optimize from a guess. A hot path you cannot show is not a hot path.
* Never trade correctness, compatibility, or a [security](code.md#security) rule for speed.
* Never change a public signature or a default for speed without approval. See [compatibility](code.md#compatibility).
* Keep the simplest code that meets the goal. Stop when the goal is met.

## Goals

State the goal before you measure. A goal names the operation, the data size, and the limit.

| Good | Bad |
| :--- | :--- |
| `ConcurrentTaskRunner.RunAsync` over 100,000 items adds under 1 second | Make the runner faster |
| `ActivitySummary.Add` handles 50,000 events under 50 MB | Reduce memory |

The helpers run inside Jellyfin on the user's server. Treat its CPU, memory, and disk as shared. A helper that is fast but starves playback has failed.

## Check These First

These causes are common. Check each against the code before you measure anything.

| Check | Usual cause |
| :--- | :--- |
| A loop that repeats work whose answer does not change | The answer should be computed once, as `TemplateLoader` caches a template |
| A string or a regex built on every call | A static field or a `GeneratedRegex` is enough |
| A file read or written on every call | The caller should hold the value, or `JsonFileStore` should batch |
| A body or file copied into memory | It should stream, as `StreamUtilities` does |
| A log string built in a hot loop | The string is built even when the level is off |
| A lock held across slow work | Hold it for the shortest time, and never across an `await` |

If the code shows the cause, a Tier 1 test is enough to prove it.

## Tools

Use only the tools Microsoft ships for .NET. They need the .NET 10 SDK, the same as the repo, so check it first.

```bash
dotnet --list-sdks
```

Install the tools once. Update them with `dotnet tool update --global` and the same name.

```bash
dotnet tool install --global dotnet-trace
```

```bash
dotnet tool install --global dotnet-counters
```

```bash
dotnet tool install --global dotnet-gcdump
```

The tools install to `~/.dotnet/tools`. On macOS that folder can be missing from `PATH`, because the dotnet installer writes the literal text `~/.dotnet/tools` to `/etc/paths.d`, and a shell does not expand it. Add this line to `~/.zshrc` and open a new shell.

```bash
export PATH="$PATH:$HOME/.dotnet/tools"
```

Check that each tool runs.

```bash
dotnet-trace --version
```

| Question | Tool |
| :--- | :--- |
| Which methods use the CPU | `dotnet-trace` |
| Is the process healthy over time | `dotnet-counters` |
| What holds the memory | `dotnet-gcdump` |
| How fast is this one helper | A temporary test with `Stopwatch` and `GC.GetAllocatedBytesForCurrentThread()` |

A trace is a `.nettrace` file, which `dotnet-trace` writes by default. Open it in PerfView on Windows, or turn it into a speedscope file and open that at [speedscope.app](https://www.speedscope.app).

```bash
dotnet-trace convert run.nettrace --format Speedscope -o run
```

This writes `run.speedscope.json`. Keep every trace, dump, and test output outside the repository.

## Tier 1: Time One Helper

A helper with no I/O is best measured alone.

* Write a temporary xUnit test in `JPKribs.Jellyfin.Base.Tests/` that times the helper with `Stopwatch` and reads `GC.GetAllocatedBytesForCurrentThread()` before and after. Take the difference on the same thread, since the counter covers only the current thread. Write the numbers with `ITestOutputHelper`, and read them with `--logger "console;verbosity=detailed"`.
* Build and run in `Release`, and without a debugger.

    ```bash
    dotnet test JPKribs.Jellyfin.Base.Tests/JPKribs.Jellyfin.Base.Tests.csproj -c Release --filter FullyQualifiedName~MyTimingTest --logger "console;verbosity=detailed"
    ```

* Warm up first. Call the helper a few times before you measure, so the JIT is not in the number.
* Run it many times and take the median. One run proves nothing.
* Run it before and after the change, on the same machine, with nothing else busy.
* Give it realistic input. A list of three items hides what a list of 50,000 shows.
* A helper that touches the network uses a stub `HttpMessageHandler`, and one that touches disk uses a temp folder. Time the helper, not the network.
* Never commit the test, its output, or any trace.

To see where the time goes inside the helper, trace the test host. Make the test loop for at least 10 seconds, so a trace has time to attach. Do not use `dotnet-trace collect -- dotnet test`. It traces the `dotnet test` command and not the test code, and it can hang. Run the tests in one shell and attach from another.

Find the test host process id, which is the newest `testhost` process.

```bash
pgrep -f testhost
```

```bash
dotnet-trace collect --process-id <pid> --duration 00:00:08 --format Speedscope -o ~/Desktop/helper.nettrace
```

For what holds the memory, take a heap dump of the same process, and read it.

```bash
dotnet-gcdump collect --process-id <pid> -o ~/Desktop/helper.gcdump
```

```bash
dotnet-gcdump report ~/Desktop/helper.gcdump
```

## Tier 2: Trace One Path

Use the test host trace above when the cost shows in a looping test. Use a plugin only when the cost depends on that plugin's data or on Jellyfin's behavior.

1. Pack Base and build the plugin against it, per [testing.md](testing.md#consumer-build). Build it in `Release`.
2. Run Jellyfin with that plugin on a machine you control, and find the server process.

    ```bash
    dotnet-trace ps
    ```

3. Record a CPU trace while the slow task or route runs. Use the `dotnet-sampled-thread-time` profile, since the default adds JIT and loader events and makes a very large trace.

    ```bash
    dotnet-trace collect --process-id <pid> --profile dotnet-sampled-thread-time --duration 00:01:00 -o ~/Desktop/run.nettrace
    ```

    The trace ends by itself after the duration, so pick a duration longer than the run.
4. Convert it and read the `.speedscope.json` file in speedscope. Every thread is sampled, so an idle thread shows as `UNMANAGED_CODE_TIME`, and a thread running managed code shows as `CPU_TIME`. Native work such as file calls also shows as `UNMANAGED_CODE_TIME`, so credit it to the nearest Base frame above it. Ignore `System.GC.RunFinalizers`, which reports the idle finalizer thread as busy.
5. For counters, record while the run goes. Read allocation (`dotnet.gc.heap.total_allocated`), collections, thread pool queue length, and lock contentions (`dotnet.monitor.lock_contentions`).

    ```bash
    dotnet-counters collect --process-id <pid> --counters System.Runtime --format json --duration 00:01:00 -o ~/Desktop/counters
    ```

6. For what holds the memory, take a heap dump in the middle of the run and again after it, and read both. Sort the report by size times count.

    ```bash
    dotnet-gcdump collect --process-id <pid> -o ~/Desktop/mid.gcdump
    ```

If the server runs in a container, the tools must run inside it, from the same `/tmp` as the server, since a tool on the host cannot reach a process in a container. That setup is the plugin's own. Follow its guide, and keep Base's part to the helper frames in the trace.

## Tier 3: Go Deeper

Stop and ask before you start Tier 3. Say what Tier 2 left unanswered and what you will do.

* Take a heap dump in the middle of the run and after it, per the memory step of Tier 2.
* Run a plugin at a larger scale, with its data, to see how a helper grows.
* Trace a second path only when the first trace points at it.

## Reading a Trace

* **Inclusive time** is a method plus everything it calls. **Exclusive time** is the method alone. Start from the largest inclusive Base frame and walk down to the largest exclusive one.
* A frame in `System.Threading` or a wait is time spent blocked. Find what it waits on, since more CPU will not help.
* Many small frames in the allocator or the GC point to allocation pressure. Read the allocation counters, then find the allocating call.
* Time spent in a `Task` that never shows CPU is waiting on I/O. Count the calls before you tune one call.

## Common Fixes

Try these in order. Each is cheaper and safer than the next.

1. **Do less.** Return early. Skip work whose input has not changed.
2. **Do it once.** Hoist work out of a loop. Cache a result in a static field, never across a change in its inputs.
3. **Do it in bulk.** One write for a batch, not one per item.
4. **Do it together.** Run independent work with `ConcurrentTaskRunner`, with a limit that respects the other side.
5. **Allocate less.** Use `Span<T>`, `StringBuilder`, pooled buffers, and `static` lambdas where a trace shows allocation pressure. Never do this without a number.
6. **Stream, never buffer.** Read a file or a response as a stream. Never load a large file into memory.

### Async and Threads

* Never block on a task with `.Result` or `.Wait()`. It starves the thread pool.
* Pass the `CancellationToken` through, so a stopped run stops working.
* Hold a lock for the shortest time, and never across an `await`.
* Bound every queue and every degree of parallelism.

### HTTP

* `JpkHttp` uses the client Jellyfin supplies. Never build a new `HttpClient` per call.
* Keep the response cap, the timeout, and the no throw contract of `JpkHttp`. Never loosen one for speed.

### Logging

* Use `ILogger` templates, never string interpolation.
* A log in a hot loop costs even when the level is off. Move it out of the loop or guard it with `IsEnabled`.

## Proving the Result

1. Measure the same operation before and after, with the same data and the same machine. Record both numbers.
2. Run the tests for every layer the change touches, per [testing.md](testing.md#layers). A faster wrong answer is a bug.
3. Check that the public signature and the behavior of the helper did not change, per [compatibility](code.md#compatibility).
4. Check that memory and the thread count stay flat across a long run.
5. Report the numbers in the commit message or the report, as before and after for the same operation.

## What Not to Do

* Never ship a profiler, a timing test, a `Stopwatch`, an allocation counter, or a timing log in Base.
* Never commit trace files, gcdumps, or timing output.
* Never raise a timeout or lower a retry count to hide a slow call.
* Never remove a check or a guard to gain speed, especially in a security helper.
* Never profile a Debug build. Use `Release`.
* Never change a [stop and ask](../starthere.md#stop-and-ask) item without approval, even when it is the cause.

## Checklist

* [ ] The reason to profile is a symptom, a change to a hot path, or a number that grew.
* [ ] The tier, the path, and the stop reason are in the report.
* [ ] The goal names the operation, the data size, and the limit.
* [ ] A trace, a counter, or a timed test shows where the time or memory goes.
* [ ] The fix is the simplest one that meets the goal.
* [ ] Before and after numbers exist for the same operation and data.
* [ ] A `Release` build was measured.
* [ ] The tests for every touched layer pass, and the public API is unchanged.
* [ ] No profiler code, trace file, timing test, or output is in the diff.
* [ ] Anything on the stop and ask list was approved first.
