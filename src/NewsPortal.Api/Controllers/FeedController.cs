using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Interfaces;
using System.Text;
using System.Xml;

namespace NewsPortal.Api.Controllers;

[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/rss+xml")]
public class FeedController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<FeedController> _logger;
    private readonly string _baseUrl;

    public FeedController(IUnitOfWork unitOfWork, ILogger<FeedController> logger, IConfiguration config)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
        _baseUrl = config["AppSettings:BaseUrl"] ?? "https://newsportal.com";
    }

    [HttpGet("rss")]
    public async Task<IActionResult> GetRssFeed([FromQuery] string? category = null)
    {
        try
        {
            var articles = await _unitOfWork.NewsArticles.GetLatestAsync(50);
            
            if (!string.IsNullOrEmpty(category))
            {
                var cat = await _unitOfWork.Categories.GetBySlugAsync(category);
                if (cat != null)
                {
                    articles = articles.Where(a => a.CategoryId == cat.Id).ToList();
                }
            }

            var xml = GenerateRssXml(articles);

            return Content(xml, "application/rss+xml; charset=utf-8", Encoding.UTF8);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating RSS feed");
            return StatusCode(500, new { message = "Failed to generate RSS feed" });
        }
    }

    private string GenerateRssXml(IEnumerable<Core.Entities.NewsArticle> articles)
    {
        var sb = new StringBuilder();
        sb.AppendLine(@"<?xml version=""1.0"" encoding=""UTF-8""?>");
        sb.AppendLine(@"<rss version=""2.0"" xmlns:atom=""http://www.w3.org/2005/Atom"" xmlns:content=""http://purl.org/rss/1.0/modules/content/"">");
        sb.AppendLine(@"  <channel>");
        sb.AppendLine(@"    <title>NewsPortal - Latest News</title>");
        sb.AppendLine($@"    <link>{EscapeXml(_baseUrl)}</link>");
        sb.AppendLine(@"    <description>Stay updated with the latest headlines from trusted news sources worldwide</description>");
        sb.AppendLine(@"    <language>en-us</language>");
        sb.AppendLine($@"    <lastBuildDate>{DateTime.UtcNow:R}</lastBuildDate>");
        sb.AppendLine($@"    <atom:link href=""{_baseUrl}/api/v1/feed/rss"" rel=""self"" type=""application/rss+xml"" />");

        foreach (var article in articles)
        {
            sb.AppendLine(@"    <item>");
            sb.AppendLine($@"      <title>{EscapeXml(article.Title)}</title>");
            sb.AppendLine($@"      <link>{_baseUrl}/news/{article.Slug}</link>");
            sb.AppendLine($@"      <guid isPermaLink=""false"">{_baseUrl}/news/{article.Slug}</guid>");
            sb.AppendLine($@"      <pubDate>{(article.PublishedAt ?? article.FetchedAt):R}</pubDate>");
            sb.AppendLine($@"      <description>{EscapeXml(article.Summary ?? "")}</description>");
            
            if (!string.IsNullOrEmpty(article.Content))
            {
                sb.AppendLine($@"      <content:encoded><![CDATA[{article.Content}]]></content:encoded>");
            }

            if (article.Source != null)
            {
                sb.AppendLine($@"      <source>{EscapeXml(article.Source.Name)}</source>");
            }

            if (article.Category != null)
            {
                sb.AppendLine($@"      <category>{EscapeXml(article.Category.Name)}</category>");
            }

            sb.AppendLine(@"    </item>");
        }

        sb.AppendLine(@"  </channel>");
        sb.AppendLine(@"</rss>");

        return sb.ToString();
    }

    private string EscapeXml(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        
        return input
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
    }
}
