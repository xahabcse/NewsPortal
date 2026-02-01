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
            var totalItems = 0;
            var successfulItems = 0;
            var skippedItems = 0;

            foreach (var item in feed.Items)
            {
                totalItems++;

                try
                {
                    // Validate minimum required fields: Title and Link
                    if (string.IsNullOrWhiteSpace(item.Title))
                    {
                        _logger.LogWarning("Skipping RSS feed item without title from {FeedUrl}. Link: {Link}",
                            feedUrl, item.Link ?? "N/A");
                        skippedItems++;
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(item.Link))
                    {
                        _logger.LogWarning("Skipping RSS feed item without link from {FeedUrl}. Title: {Title}",
                            feedUrl, item.Title);
                        skippedItems++;
                        continue;
                    }

                    // Extract image with error handling
                    string? imageUrl = null;
                    try
                    {
                        imageUrl = ExtractImageFromContent(item.Content) ?? ExtractImageFromDescription(item.Description);
                    }
                    catch (Exception imgEx)
                    {
                        _logger.LogWarning(imgEx, "Failed to extract image from RSS item. Title: {Title}", item.Title);
                    }

                    results.Add(new SearchResultDto
                    {
                        Title = item.Title,
                        Summary = item.Description ?? string.Empty,
                        Url = item.Link,
                        ImageUrl = imageUrl,
                        PublishedAt = item.PublishingDate,
                        SourceName = feed.Title
                    });

                    successfulItems++;
                }
                catch (Exception itemEx)
                {
                    _logger.LogWarning(itemEx, "Failed to process individual RSS feed item from {FeedUrl}. Title: {Title}",
                        feedUrl, item?.Title ?? "N/A");
                    skippedItems++;
                }
            }

            _logger.LogInformation("Parsed RSS feed {FeedUrl}: {Successful}/{Total} items successful, {Skipped} skipped",
                feedUrl, successfulItems, totalItems, skippedItems);

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
