using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace NewsPortal.Service.Helpers;

public static class SlugHelper
{
    public static string GenerateSlug(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return Guid.NewGuid().ToString("N")[..8];

        var slug = title.ToLowerInvariant();

        // Remove diacritics for Latin characters only, skipping Bengali characters
        // Bengali Unicode range is U+0980 to U+09FF
        if (!slug.Any(c => c >= '\u0980' && c <= '\u09FF'))
        {
            slug = RemoveDiacritics(slug);
        }

        // Replace spaces with hyphens
        slug = Regex.Replace(slug, @"\s+", "-");

        // Remove invalid characters
        slug = Regex.Replace(slug, @"[^a-z0-9\-\u0980-\u09FF]", "");

        // Remove multiple hyphens
        slug = Regex.Replace(slug, @"-+", "-");

        // Trim hyphens from start and end
        slug = slug.Trim('-');

        // Limit length
        if (slug.Length > 200)
            slug = slug[..200].TrimEnd('-');

        // Add unique suffix
        var uniqueSuffix = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
        slug = $"{slug}-{uniqueSuffix}";

        return slug;
    }

    private static string RemoveDiacritics(string text)
    {
        var normalizedString = text.Normalize(NormalizationForm.FormD);
        var stringBuilder = new StringBuilder();

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                stringBuilder.Append(c);
            }
        }

        return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
    }
}
