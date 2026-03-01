using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class ArticleReportConfiguration : IEntityTypeConfiguration<ArticleReport>
{
    public void Configure(EntityTypeBuilder<ArticleReport> builder)
    {
        builder.ToTable("article_reports");
        builder.HasKey(r => r.Id);

        // One report per user per article
        builder.HasIndex(r => new { r.UserId, r.ArticleId }).IsUnique();
        builder.HasIndex(r => r.Status);

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Article)
            .WithMany()
            .HasForeignKey(r => r.ArticleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(r => r.Reason)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(r => r.Details)
            .HasMaxLength(500);

        builder.Property(r => r.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("pending");
    }
}
