using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NewsPortal.Core.Entities;

namespace NewsPortal.Repository.Data.Configurations;

public class SourceFetchJobConfiguration : IEntityTypeConfiguration<SourceFetchJob>
{
    public void Configure(EntityTypeBuilder<SourceFetchJob> builder)
    {
        builder.ToTable("source_fetch_jobs");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TriggerType)
            .IsRequired()
            .HasMaxLength(32);

        builder.Property(x => x.ErrorCode)
            .HasMaxLength(64);

        builder.Property(x => x.ErrorSummary)
            .HasMaxLength(1000);

        builder.Property(x => x.HangfireJobId)
            .HasMaxLength(128);

        builder.HasIndex(x => x.ExternalId).IsUnique();
        builder.HasIndex(x => x.SourceId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.CreatedAt);

        builder.HasOne(x => x.Source)
            .WithMany(x => x.FetchJobs)
            .HasForeignKey(x => x.SourceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

