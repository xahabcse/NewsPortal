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
                client.Timeout = TimeSpan.FromSeconds(30);
            });

        // Configure HttpClient for ContentScraperService (lazy content fetching)
        services.AddHttpClient<IContentScraperService, ContentScraperService>()
            .ConfigureHttpClient(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            });

        services.AddScoped<IRssFeedService, RssFeedService>();

        services.AddScoped<INewsFetcherService, NewsFetcherService>();

        return services;
    }
}
