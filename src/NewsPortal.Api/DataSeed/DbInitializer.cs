using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;
using NewsPortal.Repository.Data;

namespace NewsPortal.Api.DataSeed;

public static class DbInitializer
{
    public static void Initialize(NewsPortalDbContext context)
    {
        // EnsureCreated() removed - using migrations instead

        if (context.Categories.Any())
        {
            return; // DB has been seeded
        }

        SeedCategories(context);
        SeedNewsSources(context);
    }

    private static void SeedCategories(NewsPortalDbContext context)
    {
        var categories = new Category[]
        {
            new() { Name = "Technology", NameBn = "প্রযুক্তি", Slug = "technology", SortOrder = 1 },
            new() { Name = "Business", NameBn = "ব্যবসা", Slug = "business", SortOrder = 2 },
            new() { Name = "Sports", NameBn = "খেলাধুলা", Slug = "sports", SortOrder = 3 },
            new() { Name = "Science", NameBn = "বিজ্ঞান", Slug = "science", SortOrder = 4 },
            new() { Name = "Entertainment", NameBn = "বিনোদন", Slug = "entertainment", SortOrder = 5 }
        };

        context.Categories.AddRange(categories);
        context.SaveChanges();
    }

    private static void SeedNewsSources(NewsPortalDbContext context)
    {
        var sources = new NewsSource[]
        {
            new()
            {
                Name = "TechCrunch",
                Slug = "techcrunch",
                BaseUrl = "https://techcrunch.com",
                FetchMethod = FetchMethod.Rss,
                RssFeedUrl = "https://techcrunch.com/feed/",
                FetchIntervalMinutes = 15
            },
            new()
            {
                Name = "BBC News",
                Slug = "bbc-news",
                BaseUrl = "https://www.bbc.com/news",
                FetchMethod = FetchMethod.Rss,
                RssFeedUrl = "http://feeds.bbci.co.uk/news/rss.xml",
                FetchIntervalMinutes = 30
            },
            new()
            {
                Name = "Daily Star",
                Slug = "daily-star",
                BaseUrl = "https://www.thedailystar.net",
                FetchMethod = FetchMethod.Rss,
                RssFeedUrl = "https://www.thedailystar.net/rss.xml",
                FetchIntervalMinutes = 30
            }
        };

        context.NewsSources.AddRange(sources);
        context.SaveChanges();
    }
}
