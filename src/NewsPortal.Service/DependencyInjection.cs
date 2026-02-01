using Microsoft.Extensions.DependencyInjection;
using NewsPortal.Service.Services;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Service;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<INewsService, NewsService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<INewsSourceService, NewsSourceService>();

        // Configure HttpClient with timeout for ScrapingService
        services.AddHttpClient<IScrapingService, ScrapingService>()
            .ConfigureHttpClient(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30); // 30 second timeout for scraping requests
            });

        // Configure HttpClient with timeout for RssFeedService
        services.AddHttpClient<IRssFeedService, RssFeedService>()
            .ConfigureHttpClient(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(20); // 20 second timeout for RSS feed requests
            });

        services.AddScoped<INewsFetcherService, NewsFetcherService>();

        return services;
    }
}
