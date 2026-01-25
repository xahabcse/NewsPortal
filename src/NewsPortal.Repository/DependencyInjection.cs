using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using NewsPortal.Core.Interfaces;
using NewsPortal.Repository.Data;
using NewsPortal.Repository.MongoDB;
using NewsPortal.Repository.Redis;
using NewsPortal.Repository.Repositories;

namespace NewsPortal.Repository;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // PostgreSQL
        services.AddDbContext<NewsPortalDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("PostgreSQL"),
                b => b.MigrationsAssembly(typeof(NewsPortalDbContext).Assembly.FullName)));

        // MongoDB
        services.AddSingleton<IMongoClient>(sp =>
        {
            var connectionString = configuration.GetConnectionString("MongoDB");
            return new MongoClient(connectionString);
        });

        services.AddSingleton(sp =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            return client.GetDatabase("newsportal");
        });

        // Redis
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
            options.InstanceName = "NewsPortal:";
        });

        // Repositories
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<INewsArticleRepository, NewsArticleRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<INewsSourceRepository, NewsSourceRepository>();
        services.AddScoped<INewsFetchLogRepository, NewsFetchLogRepository>();

        // Services
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddHttpClient<IImageStorageService, MongoImageStorageService>();

        return services;
    }
}
