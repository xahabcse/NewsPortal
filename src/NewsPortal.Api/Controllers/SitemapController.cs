using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Produces("application/xml")]
public class SitemapController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SitemapController> _logger;
    private readonly string _baseUrl;

    public SitemapController(IUnitOfWork unitOfWork, ILogger<SitemapController> logger, IConfiguration config)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
        _baseUrl = config["AppSettings:BaseUrl"] ?? "https://newsportal.com";
    }

    [HttpGet]
    public async Task<IActionResult> GetSitemap()
    {
        try
        {
            // Get static pages
            var staticUrls = new List<UrlEntry>
            {
                new UrlEntry { Location = $"{_baseUrl}/", Changefreq = "hourly", Priority = "1.0" },
                new UrlEntry { Location = $"{_baseUrl}/trending", Changefreq = "hourly", Priority = "0.8" },
                new UrlEntry { Location = $"{_baseUrl}/news-sources", Changefreq = "weekly", Priority = "0.5" }
            };

            // Get article slugs
            var articles = await _unitOfWork.NewsArticles.GetAllAsync();
            var articleUrls = articles.Select(a => new UrlEntry
            {
                Location = $"{_baseUrl}/news/{a.Slug}",
                Lastmod = a.UpdatedAt?.ToString("yyyy-MM-ddTHH:mm:ssZ") ?? DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                Changefreq = "monthly",
                Priority = "0.6"
            }).ToList();

            // Get category slugs
            var categories = await _unitOfWork.Categories.GetAllAsync();
            var categoryUrls = categories.Select(c => new UrlEntry
            {
                Location = $"{_baseUrl}/category/{c.Slug}",
                Changefreq = "hourly",
                Priority = "0.7"
            }).ToList();

            var allUrls = staticUrls.Concat(articleUrls).Concat(categoryUrls).ToList();

            // Generate XML
            var xml = GenerateSitemapXml(allUrls);

            return Content(xml, "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating sitemap");
            return StatusCode(500, new { message = "Failed to generate sitemap" });
        }
    }

    private string GenerateSitemapXml(List<UrlEntry> urls)
    {
        var xml = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">";

        foreach (var url in urls)
        {
            xml += @"
  <url>
    <loc>" + EscapeXml(url.Location) + @"</loc>";

            if (!string.IsNullOrEmpty(url.Lastmod))
            {
                xml += @"
    <lastmod>" + url.Lastmod + @"</lastmod>";
            }

            if (!string.IsNullOrEmpty(url.Changefreq))
            {
                xml += @"
    <changefreq>" + url.Changefreq + @"</changefreq>";
            }

            if (!string.IsNullOrEmpty(url.Priority))
            {
                xml += @"
    <priority>" + url.Priority + @"</priority>";
            }

            xml += @"
  </url>";
        }

        xml += @"
</urlset>";

        return xml;
    }

    private string EscapeXml(string input)
    {
        return input
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
    }

    private class UrlEntry
    {
        public string Location { get; set; } = string.Empty;
        public string? Lastmod { get; set; }
        public string? Changefreq { get; set; }
        public string? Priority { get; set; }
    }
}
