using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class UserReadHistoryConfiguration : IEntityTypeConfiguration<UserReadHistory>
{
    public void Configure(EntityTypeBuilder<UserReadHistory> builder)
    {
        builder.ToTable("user_read_history");

        builder.HasKey(h => h.Id);

        builder.HasIndex(h => new { h.UserId, h.ArticleId });

        builder.HasOne(h => h.User)
            .WithMany()
            .HasForeignKey(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(h => h.Article)
            .WithMany()
            .HasForeignKey(h => h.ArticleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(h => h.ReadAt)
            .HasColumnName("read_at")
            .HasDefaultValueSql("NOW()");
    }
}
