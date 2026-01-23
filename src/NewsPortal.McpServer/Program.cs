using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol.Server;
using NewsPortal.Application;
using NewsPortal.Infrastructure;
using NewsPortal.McpServer.Tools;
using Serilog;
using Hangfire;
using Hangfire.PostgreSql;
using NewsPortal.BackgroundJobs;
using NewsPortal.BackgroundJobs.Jobs;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.File("logs/mcp-server-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    Log.Information("Starting NewsPortal MCP Server");

    var builder = Host.CreateApplicationBuilder(args);

    // Add configuration
    builder.Configuration
        .SetBasePath(Directory.GetCurrentDirectory())
        .AddJsonFile("appsettings.json", optional: true)
        .AddEnvironmentVariables();

    // Add services
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddApplication();
    builder.Services.AddBackgroundJobs();

    // Add Hangfire
    builder.Services.AddHangfire(configuration => configuration
        .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
        .UseSimpleAssemblyNameTypeSerializer()
        .UseRecommendedSerializerSettings()
        .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("PostgreSQL"))));

    // Add the processing server as IHostedService
    builder.Services.AddHangfireServer(options =>
    {
        options.WorkerCount = 1; // Limit workers for low-resource environment
    });

    // Add MCP Server
    builder.Services.AddMcpServer()
        .WithStdioServerTransport()
        .WithToolsFromAssembly(typeof(NewsTools).Assembly);

    builder.Services.AddLogging(logging =>
    {
        logging.AddSerilog(dispose: true);
    });

    var host = builder.Build();

    // Schedule Recurring Jobs
    using (var scope = host.Services.CreateScope())
    {
        var recurringJobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
        
        // Fetch news every 15 minutes
        recurringJobManager.AddOrUpdate<INewsFetchJob>(
            "news-fetch-all",
            job => job.FetchAllSourcesAsync(),
            "*/15 * * * *");
            
        // Cleanup cache daily
        recurringJobManager.AddOrUpdate<ICacheCleanupJob>(
            "cache-cleanup",
            job => job.CleanupAsync(),
            Cron.Daily);
            
        Log.Information("Background jobs scheduled");
    }

    await host.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
