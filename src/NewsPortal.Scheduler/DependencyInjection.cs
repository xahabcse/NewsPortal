using Microsoft.Extensions.DependencyInjection;
using NewsPortal.Scheduler.Jobs;

namespace NewsPortal.Scheduler;

public static class DependencyInjection
{
    public static IServiceCollection AddBackgroundJobs(this IServiceCollection services)
    {
        services.AddScoped<INewsFetchJob, NewsFetchJob>();
        services.AddScoped<ICacheCleanupJob, CacheCleanupJob>();

        return services;
    }
}
