using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Enums;

namespace NewsPortal.Infrastructure.Data;

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
                }
            };

            await context.NewsSources.AddRangeAsync(sources);
            await context.SaveChangesAsync();
        }
    }
}
