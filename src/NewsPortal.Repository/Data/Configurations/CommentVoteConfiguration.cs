using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class CommentVoteConfiguration : IEntityTypeConfiguration<CommentVote>
{
    public void Configure(EntityTypeBuilder<CommentVote> builder)
    {
        builder.ToTable("comment_votes");
        builder.HasKey(v => v.Id);

        // One vote per user per comment
        builder.HasIndex(v => new { v.UserId, v.CommentId }).IsUnique();
        builder.HasIndex(v => v.CommentId);

        builder.HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.Comment)
            .WithMany()
            .HasForeignKey(v => v.CommentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
