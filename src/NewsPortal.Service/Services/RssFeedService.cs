using CodeHollow.FeedReader;
using Microsoft.Extensions.Logging;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public class RssFeedService : IRssFeedService
{
    private readonly ILogger<RssFeedService> _logger;

    public RssFeedService(ILogger<RssFeedService> logger)
    {
        _logger = logger;
    }

    public async Task<IEnumerable<SearchResultDto>> ParseFeedAsync(string feedUrl)
    {
        try
        {
            var feed = await FeedReader.ReadAsync(feedUrl);
            var results = new List<SearchResultDto>();

            foreach (var item in feed.Items)
            {
                results.Add(new SearchResultDto
                {
                    Title = item.Title ?? string.Empty,
                    Summary = item.Description ?? string.Empty,
                    Url = item.Link ?? string.Empty,
                    ImageUrl = ExtractImageFromContent(item.Content) ?? ExtractImageFromDescription(item.Description),
                    PublishedAt = item.PublishingDate,
                    SourceName = feed.Title
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse RSS feed: {FeedUrl}", feedUrl);
            return Enumerable.Empty<SearchResultDto>();
        }
    }

    private static string? ExtractImageFromContent(string? content)
    {
        if (string.IsNullOrEmpty(content))
            return null;

        var doc = new HtmlAgilityPack.HtmlDocument();
        doc.LoadHtml(content);

        var imgNode = doc.DocumentNode.SelectSingleNode("//img");
        return imgNode?.GetAttributeValue("src", null);
    }

    private static string? ExtractImageFromDescription(string? description)
    {
        return ExtractImageFromContent(description);
    }
}
