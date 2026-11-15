using System;
using System.IO;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A small, thread safe JSON file store for one value of type <typeparamref name="T"/>, for the runtime state a plugin keeps beside its configuration.
/// Usage counters, lockouts, and cursors are examples.
/// </summary>
/// <remarks>
/// A read of a missing or corrupt file returns a fresh value. A write goes to a temp file that is then swapped in, so a crash mid-write cannot leave a truncated file.
/// All access is serialized on a lock per instance, so two instances on the same file do not exclude each other.
/// </remarks>
/// <typeparam name="T">The stored type. It must round-trip through JSON and have a public parameterless constructor.</typeparam>
public sealed class JsonFileStore<T>
    where T : class, new()
{
    private static readonly JsonSerializerOptions _options = new() { WriteIndented = true };

    private readonly string _path;
    private readonly ILogger? _logger;
    private readonly object _lock = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="JsonFileStore{T}"/> class.
    /// </summary>
    /// <param name="path">The absolute path of the backing JSON file. Its directory is created on the first save.</param>
    /// <param name="logger">An optional logger. When given, an unreadable file is logged as a warning before a fresh value is returned.</param>
    public JsonFileStore(string path, ILogger? logger = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        _path = path;
        _logger = logger;
    }

    /// <summary>
    /// Loads the stored value, or a new <typeparamref name="T"/> when the file is absent, empty, or unreadable.
    /// It does not throw for a missing or corrupt file.
    /// </summary>
    /// <returns>The deserialized value, or a fresh instance.</returns>
    public T Load()
    {
        lock (_lock)
        {
            try
            {
                if (!File.Exists(_path))
                {
                    return new T();
                }

                var json = File.ReadAllText(_path);
                if (string.IsNullOrWhiteSpace(json))
                {
                    return new T();
                }

                return JsonSerializer.Deserialize<T>(json) ?? new T();
            }
            catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
            {
                _logger?.LogWarning(ex, "Could not read {Path}, starting fresh.", _path);
                return new T();
            }
        }
    }

    /// <summary>
    /// Persists <paramref name="value"/> by swapping in a temp file, creating the parent directory if needed.
    /// </summary>
    /// <remarks>An I/O failure is not caught. The temp file is removed and the exception propagates.</remarks>
    /// <param name="value">The value to store.</param>
    public void Save(T value)
    {
        ArgumentNullException.ThrowIfNull(value);

        lock (_lock)
        {
            var dir = Path.GetDirectoryName(_path);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.SerializeToUtf8Bytes(value, _options);
            AtomicFile.WriteAllBytes(_path, json, logger: _logger);
        }
    }

    /// <summary>
    /// Loads the value, applies <paramref name="mutate"/>, and saves the result under one lock, so a read, change, and write cannot interleave with another caller on this instance.
    /// </summary>
    /// <param name="mutate">The mutation to apply to the loaded value.</param>
    /// <returns>The mutated value that was saved.</returns>
    public T Update(Action<T> mutate)
    {
        ArgumentNullException.ThrowIfNull(mutate);

        lock (_lock)
        {
            var value = Load();
            mutate(value);
            Save(value);
            return value;
        }
    }

    /// <summary>
    /// Loads the value, applies <paramref name="mutate"/>, and saves only when it returns <c>true</c>, all under one lock.
    /// Use it when most calls change nothing, such as checking a counter before bumping it.
    /// </summary>
    /// <param name="mutate">The mutation. It returns <c>true</c> to persist the change.</param>
    /// <returns>Whether the value was saved.</returns>
    public bool UpdateIf(Func<T, bool> mutate)
    {
        ArgumentNullException.ThrowIfNull(mutate);

        lock (_lock)
        {
            var value = Load();
            if (!mutate(value))
            {
                return false;
            }

            Save(value);
            return true;
        }
    }
}
