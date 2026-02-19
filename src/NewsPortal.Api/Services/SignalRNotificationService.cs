using Microsoft.AspNetCore.SignalR;
using NewsPortal.Api.Hubs;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Services;

public interface ISignalRNotificationService
{
    Task NotifyNewArticleAsync(int articleId, string title, string categoryName);
    Task NotifyBreakingNewsAsync(string title);
}

public class SignalRNotificationService : ISignalRNotificationService
{
    private readonly IHubContext<NewsHub, INewsHub> _hubContext;
    private readonly ILogger<SignalRNotificationService> _logger;

    public SignalRNotificationService(
        IHubContext<NewsHub, INewsHub> hubContext,
        ILogger<SignalRNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyNewArticleAsync(int articleId, string title, string categoryName)
    {
        try
        {
            await _hubContext.Clients.All.NewArticleAvailable(articleId, title, categoryName);
            _logger.LogInformation("Sent new article notification for article {ArticleId}", articleId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send new article notification");
        }
    }

    public async Task NotifyBreakingNewsAsync(string title)
    {
        try
        {
            await _hubContext.Clients.All.BreakingNews(title);
            _logger.LogInformation("Sent breaking news notification: {Title}", title);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send breaking news notification");
        }
    }
}
