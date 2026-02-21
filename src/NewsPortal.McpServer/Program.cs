using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol.Server;
using NewsPortal.Service;
using NewsPortal.Repository;
using NewsPortal.McpServer.Tools;
using Serilog;
using Hangfire;
using Hangfire.PostgreSql;
using NewsPortal.Scheduler;
using NewsPortal.Scheduler.Jobs;
using Prometheus;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("Application", "NewsPortal.McpServer")
    .WriteTo.File("logs/mcp-server-.log", rollingInterval: RollingInterval.Day)
    .WriteTo.Console()
    .WriteTo.Seq(Environment.GetEnvironmentVariable("ConnectionStrings__Seq") ?? "http://seq:5341")
    .CreateLogger();

try
{
    Log.Information("Starting NewsPortal MCP Server");

    var builder = Host.CreateApplicationBuilder(args);

    // Add configuration
    builder.Configuration
        .SetBasePath(Directory.GetCurrentDirectory())
        .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
        .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
        .AddEnvironmentVariables();

    // Validate required connection strings
    var postgresConnection = builder.Configuration.GetConnectionString("PostgreSQL");
    var mongoConnection = builder.Configuration.GetConnectionString("MongoDB");
    var redisConnection = builder.Configuration.GetConnectionString("Redis");

    if (string.IsNullOrWhiteSpace(postgresConnection))
    {
        Log.Fatal("PostgreSQL connection string is not configured. Set ConnectionStrings__PostgreSQL environment variable.");
        throw new InvalidOperationException("PostgreSQL connection string is required");
    }

    if (string.IsNullOrWhiteSpace(mongoConnection))
    {
        Log.Fatal("MongoDB connection string is not configured. Set ConnectionStrings__MongoDB environment variable.");
        throw new InvalidOperationException("MongoDB connection string is required");
    }

    if (string.IsNullOrWhiteSpace(redisConnection))
    {
        Log.Fatal("Redis connection string is not configured. Set ConnectionStrings__Redis environment variable.");
        throw new InvalidOperationException("Redis connection string is required");
    }

    Log.Information("All required connection strings validated successfully");

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

    // Start Prometheus MetricServer
    var metricServer = new MetricServer(port: 8080);
    metricServer.Start();
    Log.Information("Prometheus metric server started on port 8080");

    // Schedule Recurring Jobs - AddOrUpdate is synchronous and only registers jobs
    // Actual job execution happens later in Hangfire's background threads with their own scopes
    var scope = host.Services.CreateScope();
    try
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

        Log.Information("Background jobs scheduled successfully");
    }
    finally
    {
        scope.Dispose();
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
