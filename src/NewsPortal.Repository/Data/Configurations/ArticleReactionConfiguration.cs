using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class ArticleReactionConfiguration : IEntityTypeConfiguration<ArticleReaction>
{
    public void Configure(EntityTypeBuilder<ArticleReaction> builder)
    {
        builder.ToTable("article_reactions");
        builder.HasKey(r => r.Id);

        // One reaction per user per article
        builder.HasIndex(r => new { r.UserId, r.ArticleId }).IsUnique();
        builder.HasIndex(r => r.ArticleId);

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Article)
            .WithMany()
            .HasForeignKey(r => r.ArticleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(r => r.ReactionType)
            .IsRequired()
            .HasMaxLength(20);
    }
}
