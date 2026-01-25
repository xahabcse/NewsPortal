using HtmlAgilityPack;
using Microsoft.Extensions.Logging;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service.Services;

public class ScrapingService : IScrapingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ScrapingService> _logger;

    public ScrapingService(HttpClient httpClient, ILogger<ScrapingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _httpClient.DefaultRequestHeaders.Add("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    }

    public async Task<string?> ExtractContentAsync(string url, string selector)
    {
        try
        {
            var html = await _httpClient.GetStringAsync(url);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var node = doc.DocumentNode.SelectSingleNode(selector);
            return node?.InnerHtml;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract content from {Url} with selector {Selector}", url, selector);
            return null;
        }
    }

    public async Task<string?> ExtractAttributeAsync(string url, string selector, string attribute)
    {
        try
        {
            var html = await _httpClient.GetStringAsync(url);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var node = doc.DocumentNode.SelectSingleNode(selector);
            return node?.GetAttributeValue(attribute, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract attribute from {Url}", url);
            return null;
        }
    }

    public async Task<IEnumerable<string>> ExtractLinksAsync(string url, string selector)
    {
        try
        {
            var html = await _httpClient.GetStringAsync(url);
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var nodes = doc.DocumentNode.SelectNodes(selector);
            if (nodes == null)
                return Enumerable.Empty<string>();

            return nodes
                .Select(n => n.GetAttributeValue("href", string.Empty))
                .Where(href => !string.IsNullOrEmpty(href))
                .Select(href => href.StartsWith("http") ? href : new Uri(new Uri(url), href).ToString())
                .Distinct()
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract links from {Url}", url);
            return Enumerable.Empty<string>();
        }
    }
}
