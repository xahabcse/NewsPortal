using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;

namespace NewsPortal.Repository.Data;

public static class SeedData
{
    public static async Task SeedAsync(NewsPortalDbContext context)
    {
        // Seed Categories
        if (!await context.Categories.AnyAsync())
        {
            var categories = new List<Category>
            {
                new() { Name = "National", NameBn = "জাতীয়", Slug = "national", Icon = "bi-flag", Color = "#dc3545", SortOrder = 1 },
                new() { Name = "International", NameBn = "আন্তর্জাতিক", Slug = "international", Icon = "bi-globe", Color = "#0d6efd", SortOrder = 2 },
                new() { Name = "Politics", NameBn = "রাজনীতি", Slug = "politics", Icon = "bi-bank", Color = "#6f42c1", SortOrder = 3 },
                new() { Name = "Business", NameBn = "ব্যবসা", Slug = "business", Icon = "bi-graph-up", Color = "#198754", SortOrder = 4 },
                new() { Name = "Technology", NameBn = "প্রযুক্তি", Slug = "technology", Icon = "bi-cpu", Color = "#0dcaf0", SortOrder = 5 },
                new() { Name = "Sports", NameBn = "খেলাধুলা", Slug = "sports", Icon = "bi-trophy", Color = "#ffc107", SortOrder = 6 },
                new() { Name = "Entertainment", NameBn = "বিনোদন", Slug = "entertainment", Icon = "bi-film", Color = "#d63384", SortOrder = 7 },
                new() { Name = "Health", NameBn = "স্বাস্থ্য", Slug = "health", Icon = "bi-heart-pulse", Color = "#20c997", SortOrder = 8 },
                new() { Name = "Education", NameBn = "শিক্ষা", Slug = "education", Icon = "bi-mortarboard", Color = "#fd7e14", SortOrder = 9 },
                new() { Name = "Opinion", NameBn = "মতামত", Slug = "opinion", Icon = "bi-chat-quote", Color = "#6c757d", SortOrder = 10 }
            };

            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();
        }

        // Seed News Sources
        if (!await context.NewsSources.AnyAsync())
        {
            var sources = new List<NewsSource>
            {
                new()
                {
                    Name = "Prothom Alo",
                    Slug = "prothom-alo",
                    BaseUrl = "https://www.prothomalo.com",
                    RssFeedUrl = "https://www.prothomalo.com/feed",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                },
                new()
                {
                    Name = "bdnews24",
                    Slug = "bdnews24",
                    BaseUrl = "https://bdnews24.com",
                    RssFeedUrl = "https://bdnews24.com/topic/rss",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                },
                new()
                {
                    Name = "Bangla Tribune",
                    Slug = "bangla-tribune",
                    BaseUrl = "https://www.banglatribune.com",
                    RssFeedUrl = "https://www.banglatribune.com/feed",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                },
                new()
                {
                    Name = "Jagonews24",
                    Slug = "jagonews24",
                    BaseUrl = "https://www.jagonews24.com",
                    RssFeedUrl = "https://www.jagonews24.com/rss",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                },
                new()
                {
                    Name = "Sun News Bangladesh",
                    Slug = "sun-news-bangladesh",
                    BaseUrl = "https://www.sunnews24x7.com",
                    RssFeedUrl = "https://en.sunnews24x7.com/rss",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                },
                new()
                {
                    Name = "Bangladesh Sangbad Sangstha (BSS)",
                    Slug = "bss",
                    BaseUrl = "https://www.bssnews.net",
                    RssFeedUrl = "https://www.bssnews.net/rss",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                },
                new()
                {
                    Name = "The Dhaka Post",
                    Slug = "the-dhaka-post",
                    BaseUrl = "https://www.thedhakapost.com",
                    RssFeedUrl = "https://www.thedhakapost.com/rss.xml",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                },
                new()
                {
                    Name = "Daily Star (English)",
                    Slug = "daily-star",
                    BaseUrl = "https://www.thedailystar.net",
                    RssFeedUrl = "https://www.thedailystar.net/rss",
                    FetchMethod = FetchMethod.Rss,
                    FetchIntervalMinutes = 30
                }
            };

            await context.NewsSources.AddRangeAsync(sources);
            await context.SaveChangesAsync();
        }
    }
}
