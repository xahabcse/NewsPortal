using Microsoft.EntityFrameworkCore;
using NewsPortal.Application;
using NewsPortal.Infrastructure;
using NewsPortal.BackgroundJobs;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "NewsPortal.Api")
    .WriteTo.Console()
    .WriteTo.File("logs/api-.log", rollingInterval: RollingInterval.Day)
    .WriteTo.Seq(builder.Configuration.GetConnectionString("Seq") ?? "http://seq:5341")
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddControllers();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddBackgroundJobs();

// Add automatic news fetching background service
builder.Services.AddHostedService<NewsPortal.Api.BackgroundServices.NewsFetchBackgroundService>();

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Auto-apply migrations and seed data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<NewsPortal.Infrastructure.Data.NewsPortalDbContext>();
        Log.Information("Applying migrations...");
        context.Database.Migrate();
        Log.Information("Migrations applied successfully.");

        Log.Information("Seeding database...");
        DbInitializer.Initialize(context);
        Log.Information("Database seeding completed.");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while preparing the database.");
    }
}



// Configure the HTTP request pipeline.
app.UseDeveloperExceptionPage(); 

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        
        Log.Error(exceptionHandlerPathFeature?.Error, "Unhandled exception occurred");

        await context.Response.WriteAsJsonAsync(new
        {
            error = exceptionHandlerPathFeature?.Error.Message,
            details = exceptionHandlerPathFeature?.Error.StackTrace
        });
    });
});

app.UseCors("AllowAll");

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

app.Run();

public static class DbInitializer
{
    public static void Initialize(NewsPortal.Infrastructure.Data.NewsPortalDbContext context)
    {
        context.Database.EnsureCreated();

        if (context.Categories.Any())
        {
            return; // DB has been seeded
        }

        var categories = new NewsPortal.Core.Entities.Category[]
        {
            new() { Name = "Technology", NameBn = "প্রযুক্তি", Slug = "technology", SortOrder = 1 },
            new() { Name = "Business", NameBn = "ব্যবসা", Slug = "business", SortOrder = 2 },
            new() { Name = "Sports", NameBn = "খেলাধুলা", Slug = "sports", SortOrder = 3 },
            new() { Name = "Science", NameBn = "বিজ্ঞান", Slug = "science", SortOrder = 4 },
            new() { Name = "Entertainment", NameBn = "বিনোদন", Slug = "entertainment", SortOrder = 5 }
        };

        context.Categories.AddRange(categories);
        context.SaveChanges();

        var sources = new NewsPortal.Core.Entities.NewsSource[]
        {
            new() { 
                Name = "TechCrunch", 
                Slug = "techcrunch", 
                BaseUrl = "https://techcrunch.com", 
                FetchMethod = NewsPortal.Core.Enums.FetchMethod.Rss,
                RssFeedUrl = "https://techcrunch.com/feed/",
                FetchIntervalMinutes = 15
            },
            new() { 
                Name = "BBC News", 
                Slug = "bbc-news", 
                BaseUrl = "https://www.bbc.com/news", 
                FetchMethod = NewsPortal.Core.Enums.FetchMethod.Rss,
                RssFeedUrl = "http://feeds.bbci.co.uk/news/rss.xml",
                FetchIntervalMinutes = 30
            },
            new() { 
                Name = "Daily Star", 
                Slug = "daily-star", 
                BaseUrl = "https://www.thedailystar.net", 
                FetchMethod = NewsPortal.Core.Enums.FetchMethod.Rss,
                RssFeedUrl = "https://www.thedailystar.net/rss.xml",
                FetchIntervalMinutes = 30
            }
        };

        context.NewsSources.AddRange(sources);
        context.SaveChanges();
    }
}
