using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace NewsPortal.Service.Helpers;

/// <summary>
/// Provides near-duplicate title detection using character trigram Jaccard similarity.
/// </summary>
public static partial class TitleSimilarityHelper
{
    /// <summary>
    /// Computes the Jaccard similarity between two strings based on character trigrams.
    /// </summary>
    /// <param name="a">First string to compare.</param>
    /// <param name="b">Second string to compare.</param>
    /// <returns>A value between 0.0 (no similarity) and 1.0 (identical trigram sets).</returns>
    public static double ComputeSimilarity(string a, string b)
    {
        var normalizedA = Normalize(a);
        var normalizedB = Normalize(b);

        if (string.IsNullOrEmpty(normalizedA) || string.IsNullOrEmpty(normalizedB))
            return 0.0;

        if (normalizedA.Length < 3 || normalizedB.Length < 3)
            return 0.0;

        var trigramsA = ExtractTrigrams(normalizedA);
        var trigramsB = ExtractTrigrams(normalizedB);

        var intersectionCount = trigramsA.Intersect(trigramsB).Count();
        var unionCount = trigramsA.Union(trigramsB).Count();

        if (unionCount == 0)
            return 0.0;

        return (double)intersectionCount / unionCount;
    }

    /// <summary>
    /// Determines whether two titles are near-duplicates based on trigram Jaccard similarity.
    /// </summary>
    /// <param name="a">First title.</param>
    /// <param name="b">Second title.</param>
    /// <param name="threshold">Similarity threshold (default 0.85). Values at or above this are considered duplicates.</param>
    /// <returns><c>true</c> if the titles are near-duplicates; otherwise <c>false</c>.</returns>
    public static bool IsNearDuplicate(string a, string b, double threshold = 0.85)
    {
        return ComputeSimilarity(a, b) >= threshold;
    }

    /// <summary>
    /// Finds all near-duplicate titles from a collection of existing titles.
    /// </summary>
    /// <param name="title">The title to check against existing titles.</param>
    /// <param name="existingTitles">The collection of existing titles to compare with.</param>
    /// <param name="threshold">Similarity threshold (default 0.85). Values at or above this are considered duplicates.</param>
    /// <returns>A list of existing titles that are near-duplicates of the given title.</returns>
    public static List<string> FindNearDuplicates(string title, IEnumerable<string> existingTitles, double threshold = 0.85)
    {
        if (existingTitles is null)
            return [];

        return existingTitles
            .Where(existing => IsNearDuplicate(title, existing, threshold))
            .ToList();
    }

    private static string Normalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var trimmed = input.Trim().ToLowerInvariant();
        return WhitespaceRegex().Replace(trimmed, " ");
    }

    private static HashSet<string> ExtractTrigrams(string input)
    {
        var trigrams = new HashSet<string>(StringComparer.Ordinal);

        for (var i = 0; i <= input.Length - 3; i++)
        {
            trigrams.Add(input.Substring(i, 3));
        }

        return trigrams;
    }

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
