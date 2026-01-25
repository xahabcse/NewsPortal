using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class NewsArticleConfiguration : IEntityTypeConfiguration<NewsArticle>
{
    public void Configure(EntityTypeBuilder<NewsArticle> builder)
    {
        builder.ToTable("news_articles");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.Slug)
            .IsRequired()
            .HasMaxLength(550);

        builder.Property(x => x.Summary)
            .HasMaxLength(1000);

        builder.Property(x => x.SourceUrl)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(x => x.OriginalImageUrl)
            .HasMaxLength(2000);

        builder.Property(x => x.MongoImageId)
            .HasMaxLength(50);

        builder.Property(x => x.MongoThumbId)
            .HasMaxLength(50);

        builder.Property(x => x.Author)
            .HasMaxLength(200);

        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => x.SourceUrl).IsUnique();
        builder.HasIndex(x => x.PublishedAt);
        builder.HasIndex(x => x.FetchedAt);
        builder.HasIndex(x => x.IsFeatured);
        builder.HasIndex(x => x.IsActive);

        builder.HasOne(x => x.Source)
            .WithMany(x => x.Articles)
            .HasForeignKey(x => x.SourceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Category)
            .WithMany(x => x.Articles)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
