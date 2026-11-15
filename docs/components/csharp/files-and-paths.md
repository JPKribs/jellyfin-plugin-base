# Files and Paths

Safe file names, atomic writes, and folder containment checks.

## FileNameSanitizer

Turns an arbitrary string into a file name that is valid on every operating system. The same fixed set is replaced on every OS, so a name made on Linux is still valid on Windows.

Use it for names built from server data such as titles, ids, and remote paths. Do not use it on a whole path, since both slashes are replaced.

```csharp
var tempFileName = FileNameSanitizer.SanitizeTempFileName(record.SourceItemId, record.LocalPath);
// "abc123_Movie (2021).mkv"
```

**Gotchas**

* It replaces `/ \ : * ? " < > |`, NUL, and every control character, collapses runs of the replacement, and trims spaces and dots from both ends.
* A Windows reserved name such as `CON` gets an underscore appended to its base name, so `CON.txt` becomes `CON_.txt`. Names over 200 characters are cut, keeping the extension.
* A null, blank, or fully stripped name becomes `unnamed_` plus a fresh GUID, so the output is not stable for blank input.
* The `replacement` is not checked. Passing one of the invalid characters defeats the purpose.
* `SanitizeTempFileName` reads the file name with `Path.GetFileName` on the host OS. On Linux a Windows path such as `C:\Movies\Film.mkv` is not split, so the whole string is sanitized to `C_Movies_Film.mkv`.

## AtomicFile

Writes a file so a reader sees the old content or the new content and never half of it. The data goes to a temp file in the same folder, reaches the disk, and is then moved over the target.

Use it for a file another process may read at any moment, or one that must survive a crash. `JsonFileStore` uses it.

```csharp
AtomicFile.WriteAllBytes(path, bytes);
await AtomicFile.WriteAsync(path, (stream, ct) => body.CopyToAsync(stream, ct), token).ConfigureAwait(false);
var created = AtomicFile.WriteOnce(path, text);
AtomicFile.WriteAllBytes(keyPath, key, ownerOnly: true);
```

**Gotchas**

* The folder must exist. Nothing creates it.
* The temp file is `<path>.<guid>.tmp` in the same folder, so the move stays on one volume. A failure or a cancellation removes it and leaves the old file as it was.
* `WriteOnce` creates the file only when it is absent and returns whether it did. Several writers in one process racing on one path give exactly one `true`. A second process racing on the same path can still replace the file on Unix. It takes `ownerOnly` too.
* Replacing a file keeps its Unix permissions unless `ownerOnly` is set. A symbolic link at the path is replaced by a regular file and its target is left alone.
* A name whose temp file would be too long throws `ArgumentException` before anything is written. That is a file name over 255 bytes, or a full path over the OS limit.
* `ownerOnly` makes the temp file readable by its owner alone on Linux and macOS. It does nothing on Windows, where `beforeMove` receives the temp path so you can set access rules.
* `flushToDisk` is on by default, so a power loss cannot leave an empty file.
* A writer given to `WriteAsync` must not dispose the stream or keep it after it returns.

## PathContainment

Answers whether a folder is one of some folders, or inside one, by whole folder names. `/media/movies-cache` is not inside `/media/movies`.

Use it to guard a delete or a write that must stay inside a library folder. Use the foreign methods for a path that a peer or a remote server sent, since this machine's file system rules do not apply to it.

```csharp
var inside = PathContainment.IsUnderAny("/media/movies/cache", new[] { "/media/movies/", "/media/shows" }); // true

// Never delete the library root itself, only what is inside it.
if (PathContainment.IsStrictlyUnder(folder, libraryRoot)) { Directory.Delete(folder, recursive: true); }

// A Windows path from a peer, judged on Linux.
var first = PathContainment.FirstSegmentUnder(@"D:\Media\Movies\Action\Film\film.mkv", @"D:\Media\Movies"); // "Action"
```

**Gotchas**

* The local methods resolve paths with `Path.GetFullPath`, and relative paths use the current directory. A real `..` segment is resolved, and a folder named `..x` is an ordinary name.
* The local methods never resolve a symbolic link, so a link inside a root that points outside it still counts as inside.
* Every method ignores case on every OS by default. `IsStrictlyUnder` and the foreign methods take a `comparison` to change that.
* `IsUnderAny` never matches a root of `/`. `IsStrictlyUnder` and `FirstRootUnder` do. `FirstRootUnder` returns the deepest matching root unless `deepest` is false.
* The foreign methods refuse a `..`, a `.`, or a NUL segment in a path or a root. A Windows style path, which has a drive, a share, or a backslash, is also refused for a segment that is empty once its trailing dots and spaces are removed, such as `...`, or that holds a `:` other than a leading drive such as `D:`. Windows strips or reinterprets those. A path with only slashes keeps such names, so `/media/Movies/Star Wars: A New Hope` is accepted.
* The foreign methods never call `Path.GetFullPath`. They read backslashes as slashes, and they need both texts to be absolute in the same form, which is a leading slash, a drive such as `D:\`, or a share such as `\\server\share`. A relative path, a blank value, or a mix of forms never matches, so `D:\Media` does not match `/Media`.
* `C:\` is a drive root only on Windows for the local methods. On Linux it is a relative file name, so use the foreign methods for Windows text.
