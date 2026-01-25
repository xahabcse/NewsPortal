using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class ScrapingConfigConfiguration : IEntityTypeConfiguration<ScrapingConfig>
{
    public void Configure(EntityTypeBuilder<ScrapingConfig> builder)
    {
        builder.ToTable("scraping_configs");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ListPageUrl)
            .HasMaxLength(500);

        builder.Property(x => x.ArticleLinkSelector)
            .HasMaxLength(200);

        builder.Property(x => x.TitleSelector)
            .HasMaxLength(200);

        builder.Property(x => x.ContentSelector)
            .HasMaxLength(200);

        builder.Property(x => x.SummarySelector)
            .HasMaxLength(200);

        builder.Property(x => x.ImageSelector)
            .HasMaxLength(200);

        builder.Property(x => x.DateSelector)
            .HasMaxLength(200);

        builder.Property(x => x.AuthorSelector)
            .HasMaxLength(200);

        builder.HasIndex(x => x.SourceId).IsUnique();
    }
}
