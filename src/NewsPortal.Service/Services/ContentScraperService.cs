using System.Collections.Concurrent;
using HtmlAgilityPack;
using Microsoft.Extensions.Logging;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public class ContentScraperService : IContentScraperService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ContentScraperService> _logger;

    // Prevent duplicate concurrent scrapes for the same URL
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _urlLocks = new();

    // Common content selectors ordered by specificity (most specific first)
    private static readonly string[] ContentSelectors =
    [
        "//article//div[contains(@class,'story-content')]",
        "//article//div[contains(@class,'article-content')]",
        "//article//div[contains(@class,'article-body')]",
        "//article//div[contains(@class,'entry-content')]",
        "//div[contains(@class,'story-content')]",
        "//div[contains(@class,'article-content')]",
        "//div[contains(@class,'article-body')]",
        "//div[contains(@class,'entry-content')]",
        "//div[contains(@class,'post-content')]",
        "//div[contains(@class,'news-content')]",
        "//div[contains(@class,'content-area')]",
        "//div[contains(@class,'news-detail')]",
        "//div[contains(@class,'single-content')]",
        "//div[contains(@class,'td-post-content')]",
        "//div[@itemprop='articleBody']",
        "//article",
        "//main//div[contains(@class,'content')]",
    ];

    public ContentScraperService(HttpClient httpClient, ILogger<ContentScraperService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
        {
            _httpClient.DefaultRequestHeaders.Add("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        }
    }

    public async Task<string?> ScrapeFullContentAsync(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        // Per-URL lock to prevent duplicate concurrent scrapes
        var urlLock = _urlLocks.GetOrAdd(url, _ => new SemaphoreSlim(1, 1));

        await urlLock.WaitAsync();
        try
        {
            return await ScrapeContentInternalAsync(url);
        }
        finally
        {
            urlLock.Release();
            // Clean up lock if no one else is waiting
            if (urlLock.CurrentCount == 1)
                _urlLocks.TryRemove(url, out _);
        }
    }

    private async Task<string?> ScrapeContentInternalAsync(string url)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var html = await _httpClient.GetStringAsync(url, cts.Token);

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            // Remove unwanted elements (ads, scripts, styles, nav, footer, sidebars, comments)
            RemoveUnwantedNodes(doc);

            // Try each selector and pick the best result
            string? bestContent = null;
            int bestLength = 0;

            foreach (var selector in ContentSelectors)
            {
                try
                {
                    var node = doc.DocumentNode.SelectSingleNode(selector);
                    if (node == null) continue;

                    var content = CleanContent(node);
                    if (string.IsNullOrWhiteSpace(content)) continue;

                    var plainLength = HtmlToPlainTextLength(content);

                    // Pick the content with the most text (likely the full article)
                    // but only if it has a reasonable minimum length
                    if (plainLength > bestLength && plainLength > 100)
                    {
                        bestContent = content;
                        bestLength = plainLength;
                    }
                }
                catch
                {
                    // Skip failed selectors silently
                }
            }

            if (bestContent != null)
            {
                _logger.LogInformation("Successfully scraped full content from {Url} ({Length} chars)", url, bestLength);
            }
            else
            {
                _logger.LogWarning("Could not extract meaningful content from {Url}", url);
            }

            return bestContent;
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Timeout scraping content from {Url}", url);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to scrape content from {Url}", url);
            return null;
        }
    }

    private static void RemoveUnwantedNodes(HtmlDocument doc)
    {
        var selectorsToRemove = new[]
        {
            "//script", "//style", "//noscript", "//iframe",
            "//nav", "//footer", "//header",
            "//*[contains(@class,'sidebar')]",
            "//*[contains(@class,'comment')]",
            "//*[contains(@class,'social')]",
            "//*[contains(@class,'share')]",
            "//*[contains(@class,'related')]",
            "//*[contains(@class,'advertisement')]",
            "//*[contains(@class,'ad-')]",
            "//*[contains(@class,'ads')]",
            "//*[contains(@id,'comment')]",
            "//*[contains(@class,'newsletter')]",
            "//*[contains(@class,'popup')]",
        };

        foreach (var selector in selectorsToRemove)
        {
            var nodes = doc.DocumentNode.SelectNodes(selector);
            if (nodes == null) continue;
            foreach (var node in nodes.ToList())
            {
                node.Remove();
            }
        }
    }

    private static string CleanContent(HtmlNode node)
    {
        // Get inner HTML and clean up excessive whitespace
        var html = node.InnerHtml;

        // Remove empty tags
        html = System.Text.RegularExpressions.Regex.Replace(html, @"<(\w+)[^>]*>\s*</\1>", "");
        // Collapse multiple whitespace/newlines
        html = System.Text.RegularExpressions.Regex.Replace(html, @"\n\s*\n", "\n");

        return html.Trim();
    }

    private static int HtmlToPlainTextLength(string html)
    {
        var doc = new HtmlDocument();
        doc.LoadHtml(html);
        var text = doc.DocumentNode.InnerText;
        return text?.Trim().Length ?? 0;
    }
}
