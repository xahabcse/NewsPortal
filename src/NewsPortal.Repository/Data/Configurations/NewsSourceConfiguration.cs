using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class NewsSourceConfiguration : IEntityTypeConfiguration<NewsSource>
{
    public void Configure(EntityTypeBuilder<NewsSource> builder)
    {
        builder.ToTable("news_sources");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Slug)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.BaseUrl)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.LogoUrl)
            .HasMaxLength(500);

        builder.Property(x => x.RssFeedUrl)
            .HasMaxLength(500);

        builder.Property(x => x.ApiEndpoint)
            .HasMaxLength(500);

        builder.Property(x => x.ApiKey)
            .HasMaxLength(200);

        builder.Property(x => x.LastErrorCode)
            .HasMaxLength(64);

        builder.Property(x => x.LastErrorMessage)
            .HasMaxLength(1000);

        builder.Property(x => x.RequestTimeoutSeconds)
            .HasDefaultValue(90);

        builder.Property(x => x.MaxRetryAttempts)
            .HasDefaultValue(3);

        builder.Property(x => x.CircuitBreakerThreshold)
            .HasDefaultValue(5);

        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => x.IsActive);
        builder.HasIndex(x => x.HealthStatus);
        builder.HasIndex(x => x.NextRetryAt);

        builder.HasOne(x => x.ScrapingConfig)
            .WithOne(x => x.Source)
            .HasForeignKey<ScrapingConfig>(x => x.SourceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
