namespace JPKribs.Jellyfin.Base.Tasks;

/// <summary>
/// A problem found in a plugin's translations, with where it is.
/// </summary>
/// <param name="Code">The diagnostic code, such as JPKT002.</param>
/// <param name="IsError"><c>true</c> for an error that fails the build, <c>false</c> for a warning.</param>
/// <param name="Message">What is wrong and how to fix it.</param>
/// <param name="File">The file it is in, or empty for the project.</param>
/// <param name="Line">The line, from 1, or 0 when it has none.</param>
/// <param name="Column">The column, from 1, or 0 when it has none.</param>
internal sealed record TranslationDiagnostic(string Code, bool IsError, string Message, string File = "", int Line = 0, int Column = 0);
