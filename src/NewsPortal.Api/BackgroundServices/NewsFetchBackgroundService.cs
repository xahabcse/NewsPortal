using NewsPortal.BackgroundJobs.Jobs;

namespace NewsPortal.Api.BackgroundServices;

public class NewsFetchBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NewsFetchBackgroundService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(5);

    public NewsFetchBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<NewsFetchBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("News Fetch Background Service is starting.");

        // Wait 1 minute before first fetch to allow app to fully start
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Starting automatic news fetch...");

                using (var scope = _serviceProvider.CreateScope())
                {
                    var fetchJob = scope.ServiceProvider.GetRequiredService<INewsFetchJob>();
                    await fetchJob.FetchAllSourcesAsync();
                }

                _logger.LogInformation("Automatic news fetch completed. Next fetch in {Minutes} minutes.", _interval.TotalMinutes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during automatic news fetch.");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("News Fetch Background Service is stopping.");
    }
}
