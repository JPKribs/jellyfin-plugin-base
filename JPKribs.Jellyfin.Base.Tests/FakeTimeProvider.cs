using System;
using System.Collections.Generic;
using System.Threading;

namespace JPKribs.Jellyfin.Base.Tests;

/// <summary>A clock a test moves by hand, whose timers fire when the test advances past their due time.</summary>
internal sealed class FakeTimeProvider : TimeProvider
{
    private readonly object _lock = new();
    private readonly List<FakeTimer> _timers = new();
    private DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset? start = null) => _now = start ?? new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    public int ActiveTimers
    {
        get
        {
            lock (_lock)
            {
                return _timers.Count;
            }
        }
    }

    public override DateTimeOffset GetUtcNow()
    {
        lock (_lock)
        {
            return _now;
        }
    }

    public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
    {
        var timer = new FakeTimer(this, callback, state);
        timer.Change(dueTime, period);
        return timer;
    }

    public void Advance(TimeSpan by)
    {
        List<FakeTimer> due;
        lock (_lock)
        {
            _now += by;
            due = _timers.FindAll(t => t.IsDue(_now));
        }

        foreach (var timer in due)
        {
            timer.Fire(_now);
        }
    }

    private sealed class FakeTimer : ITimer
    {
        private readonly FakeTimeProvider _owner;
        private readonly TimerCallback _callback;
        private readonly object? _state;
        private DateTimeOffset? _dueAt;
        private TimeSpan _period;

        public FakeTimer(FakeTimeProvider owner, TimerCallback callback, object? state)
        {
            _owner = owner;
            _callback = callback;
            _state = state;
        }

        public bool Change(TimeSpan dueTime, TimeSpan period)
        {
            lock (_owner._lock)
            {
                _owner._timers.Remove(this);
                _period = period;
                if (dueTime == Timeout.InfiniteTimeSpan)
                {
                    _dueAt = null;
                    return true;
                }

                _dueAt = _owner._now + dueTime;
                _owner._timers.Add(this);
                return true;
            }
        }

        public bool IsDue(DateTimeOffset now) => _dueAt is { } due && due <= now;

        public void Fire(DateTimeOffset now)
        {
            lock (_owner._lock)
            {
                if (_period > TimeSpan.Zero)
                {
                    _dueAt = now + _period;
                }
                else
                {
                    _dueAt = null;
                    _owner._timers.Remove(this);
                }
            }

            _callback(_state);
        }

        public void Dispose()
        {
            lock (_owner._lock)
            {
                _owner._timers.Remove(this);
            }
        }

        public System.Threading.Tasks.ValueTask DisposeAsync()
        {
            Dispose();
            return default;
        }
    }
}
