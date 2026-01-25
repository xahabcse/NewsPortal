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

        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => x.IsActive);

        builder.HasOne(x => x.ScrapingConfig)
            .WithOne(x => x.Source)
            .HasForeignKey<ScrapingConfig>(x => x.SourceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
