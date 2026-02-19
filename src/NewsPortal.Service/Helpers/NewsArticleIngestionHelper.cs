using System.Net;
using System.Text.RegularExpressions;
using NewsPortal.Core.DTOs;

namespace NewsPortal.Service.Helpers;

public static class NewsArticleIngestionHelper
{
    private const int MinTitleLength = 5;
    private const int MaxTitleLength = 500;
    private const int MinQualityScore = 20;

    private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled);

    public static CreateNewsArticleDto Normalize(CreateNewsArticleDto dto)
    {
        var publishedAt = dto.PublishedAt.HasValue
            ? EnsureUtc(dto.PublishedAt.Value)
            : DateTime.UtcNow;

        return new CreateNewsArticleDto
        {
            Title = NormalizeText(dto.Title),
            Summary = NormalizeText(dto.Summary),
            Content = NormalizeHtml(dto.Content),
            SourceUrl = (dto.SourceUrl ?? string.Empty).Trim(),
            OriginalImageUrl = NormalizeOptionalUrl(dto.OriginalImageUrl),
            Author = NormalizeText(dto.Author),
            PublishedAt = publishedAt,
            SourceId = dto.SourceId,
            CategoryId = dto.CategoryId
        };
    }

    public static List<NewsImportIssueDto> Validate(CreateNewsArticleDto dto, string? canonicalUrl)
    {
        var issues = new List<NewsImportIssueDto>();

        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length < MinTitleLength || dto.Title.Length > MaxTitleLength)
        {
            issues.Add(new NewsImportIssueDto
            {
                Code = "INVALID_TITLE",
                Message = $"Title must be between {MinTitleLength} and {MaxTitleLength} characters.",
                SourceUrl = dto.SourceUrl,
                Title = dto.Title
            });
        }

        if (canonicalUrl == null)
        {
            issues.Add(new NewsImportIssueDto
            {
                Code = "INVALID_URL",
                Message = "Source URL must be a valid absolute HTTP/HTTPS URL.",
                SourceUrl = dto.SourceUrl,
                Title = dto.Title
            });
        }

        if (!dto.PublishedAt.HasValue || dto.PublishedAt > DateTime.UtcNow.AddMinutes(10))
        {
            issues.Add(new NewsImportIssueDto
            {
                Code = "INVALID_PUBLISHED_AT",
                Message = "PublishedAt is missing or set in the future.",
                SourceUrl = dto.SourceUrl,
                Title = dto.Title
            });
        }

        var qualityScore = CalculateQualityScore(dto);
        if (qualityScore < MinQualityScore)
        {
            issues.Add(new NewsImportIssueDto
            {
                Code = "LOW_CONTENT_QUALITY",
                Message = $"Article quality score is too low ({qualityScore}/{MinQualityScore}).",
                SourceUrl = dto.SourceUrl,
                Title = dto.Title
            });
        }

        return issues;
    }

    public static string NormalizeText(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var decoded = WebUtility.HtmlDecode(text);
        return WhitespaceRegex.Replace(decoded, " ").Trim();
    }

    public static string? NormalizeOptionalUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        return url.Trim();
    }

    private static string? NormalizeHtml(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return null;
        }

        return html.Trim();
    }

    private static int CalculateQualityScore(CreateNewsArticleDto dto)
    {
        var titleScore = Math.Min(40, dto.Title.Length / 2);
        var summaryScore = Math.Min(30, (dto.Summary ?? string.Empty).Length / 4);
        var plainText = StripHtml(dto.Content);
        var contentScore = Math.Min(30, plainText.Length / 20);

        return titleScore + summaryScore + contentScore;
    }

    private static string StripHtml(string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        var doc = new HtmlAgilityPack.HtmlDocument();
        doc.LoadHtml(html);
        return NormalizeText(doc.DocumentNode.InnerText);
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }
}
