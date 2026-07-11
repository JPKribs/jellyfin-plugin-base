using System;
using System.IO;
using System.Text.Json;

namespace JPKribs.Jellyfin.Base;

/// <summary>
/// A small, thread-safe JSON file store for a single value of type <typeparamref name="T"/>, for the runtime
/// state a plugin keeps beside its configuration (usage counters, lockouts, cursors). Reads tolerate a missing
/// or corrupt file by returning a fresh value; writes are atomic (written to a temp file then swapped in) so a
/// crash mid-write cannot leave a truncated file. All access is serialised on a per-instance lock.
/// </summary>
/// <typeparam name="T">The stored type. Must be JSON round-trippable and have a public parameterless constructor.</typeparam>
public sealed class JsonFileStore<T>
    where T : class, new()
{
    private static readonly JsonSerializerOptions _options = new() { WriteIndented = true };

    private readonly string _path;
    private readonly object _lock = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="JsonFileStore{T}"/> class.
    /// </summary>
    /// <param name="path">Absolute path to the backing JSON file. Its directory is created on first save.</param>
    public JsonFileStore(string path)
    {
        ArgumentException.ThrowIfNullOrEmpty(path);
        _path = path;
    }

    /// <summary>
    /// Loads the stored value, or a new <typeparamref name="T"/> when the file is absent, empty, or unreadable.
    /// Never throws for a missing or corrupt file.
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
                return new T();
            }
        }
    }

    /// <summary>
    /// Persists <paramref name="value"/> atomically, creating the parent directory if needed.
    /// </summary>
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

            var json = JsonSerializer.Serialize(value, _options);
            var temp = _path + ".tmp";
            File.WriteAllText(temp, json);

            // Swap the temp file into place. File.Move(overwrite) is atomic on the same volume; the temp lives
            // in the same directory as the target so the rename never crosses a filesystem boundary.
            File.Move(temp, _path, overwrite: true);
        }
    }

    /// <summary>
    /// Loads the value, applies <paramref name="mutate"/>, and saves the result under the same lock, so a
    /// read-modify-write is atomic against concurrent callers on this instance.
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
}
