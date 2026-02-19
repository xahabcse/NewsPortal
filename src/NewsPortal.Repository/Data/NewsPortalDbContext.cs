using Microsoft.EntityFrameworkCore;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data;

public class NewsPortalDbContext : DbContext
{
    public NewsPortalDbContext(DbContextOptions<NewsPortalDbContext> options)
        : base(options)
    {
    }

    public DbSet<NewsArticle> NewsArticles => Set<NewsArticle>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<NewsSource> NewsSources => Set<NewsSource>();
    public DbSet<SourceFetchJob> SourceFetchJobs => Set<SourceFetchJob>();
    public DbSet<ScrapingConfig> ScrapingConfigs => Set<ScrapingConfig>();
    public DbSet<NewsFetchLog> NewsFetchLogs => Set<NewsFetchLog>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserBookmark> UserBookmarks => Set<UserBookmark>();
    public DbSet<UserReadHistory> UserReadHistory => Set<UserReadHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(NewsPortalDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
