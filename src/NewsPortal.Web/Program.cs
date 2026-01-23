using Microsoft.EntityFrameworkCore;
using NewsPortal.Application;
using NewsPortal.Infrastructure;
using NewsPortal.Infrastructure.Data;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File("logs/web-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

    // Add services to the container
    builder.Services.AddControllersWithViews();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApplication();

    var app = builder.Build();

    // Apply migrations and seed data
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<NewsPortalDbContext>();

            // Allow migrations in all environments for Docker deployment
            await context.Database.MigrateAsync();

        await SeedData.SeedAsync(context);
    }

    // Configure the HTTP request pipeline
    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler("/Home/Error");
        app.UseHsts();
    }

    // Only redirect to HTTPS if configured (avoid loop in Docker/Proxy setup)
    if (app.Configuration.GetValue<bool>("UseHttpsRedirection", false))
    {
        app.UseHttpsRedirection();
    }
    app.UseStaticFiles();
    app.UseRouting();
    app.UseAuthorization();

    app.MapControllerRoute(
        name: "news-detail",
        pattern: "news/{slug}",
        defaults: new { controller = "News", action = "Detail" });

    app.MapControllerRoute(
        name: "category",
        pattern: "category/{slug}",
        defaults: new { controller = "News", action = "Category" });

    app.MapControllerRoute(
        name: "source",
        pattern: "source/{slug}",
        defaults: new { controller = "News", action = "Source" });

    app.MapControllerRoute(
        name: "search",
        pattern: "search",
        defaults: new { controller = "News", action = "Search" });

    app.MapControllerRoute(
        name: "default",
        pattern: "{controller=Home}/{action=Index}/{id?}");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
