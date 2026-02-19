using Microsoft.AspNetCore.Mvc;

namespace NewsPortal.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Produces("text/plain")]
public class RobotsController : ControllerBase
{
    private readonly string _baseUrl;

    public RobotsController(IConfiguration config)
    {
        _baseUrl = config["AppSettings:BaseUrl"] ?? "https://newsportal.com";
    }

    [HttpGet]
    public IActionResult GetRobotsTxt()
    {
        var robotsTxt = $@"# robots.txt for NewsPortal
# Allow all user-facing routes
User-agent: *
Allow: /
Allow: /news/
Allow: /category/
Allow: /trending
Allow: /search

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Sitemap location
Sitemap: {_baseUrl}/sitemap
";

        return Content(robotsTxt, "text/plain");
    }
}
