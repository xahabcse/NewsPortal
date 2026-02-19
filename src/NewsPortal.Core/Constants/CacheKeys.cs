namespace NewsPortal.Core.Constants;

public static class CacheKeys
{
    public const string LatestNews = "news:latest";
    public const string FeaturedNews = "news:featured";
    public const string Categories = "categories:all";
    public const string ActiveSources = "sources:active:v2";

    public static string NewsByCategory(int categoryId) => $"news:category:{categoryId}";
    public static string NewsBySource(int sourceId) => $"news:source:{sourceId}";
    public static string NewsArticle(int id) => $"news:article:{id}";
    public static string NewsArticleBySlug(string slug) => $"news:article:slug:{slug}";
    public static string SearchResults(string query) => $"search:{query.ToLowerInvariant()}";
    public static string CategoryBySlug(string slug) => $"category:slug:{slug}";
}

public static class CacheDurations
{
    public static readonly TimeSpan Short = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan Medium = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan Long = TimeSpan.FromHours(1);
    public static readonly TimeSpan VeryLong = TimeSpan.FromHours(24);
}
