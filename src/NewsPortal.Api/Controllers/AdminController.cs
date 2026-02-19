using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Enums;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<AdminController> _logger;

    public AdminController(IUnitOfWork unitOfWork, ILogger<AdminController> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        try
        {
            // Get counts
            var totalSources = await _unitOfWork.NewsSources.CountAsync();
            var totalArticles = await _unitOfWork.NewsArticles.CountAsync();
            var totalUsers = await _unitOfWork.Users.CountAsync();

            // Get source health breakdown
            var activeSources = await _unitOfWork.NewsSources.CountAsync(s => s.HealthStatus == SourceHealthStatus.Active);
            var degradedSources = await _unitOfWork.NewsSources.CountAsync(s => s.HealthStatus == SourceHealthStatus.Degraded);
            var pausedSources = await _unitOfWork.NewsSources.CountAsync(s => s.HealthStatus == SourceHealthStatus.Paused);
            var disabledSources = await _unitOfWork.NewsSources.CountAsync(s => s.HealthStatus == SourceHealthStatus.Disabled);

            // Get articles today
            var today = DateTime.UtcNow.Date;
            var articlesToday = await _unitOfWork.NewsArticles.CountAsync(a => a.FetchedAt >= today);

            // Get failed fetch jobs (last 24h)
            var failedJobs24h = await _unitOfWork.SourceFetchJobs.CountAsync(
                j => j.Status == FetchJobStatus.Failed && j.StartedAt >= DateTime.UtcNow.AddHours(-24)
            );

            // Get recent failed sources
            var failedSources = await _unitOfWork.NewsSources.CountAsync(
                s => s.ConsecutiveFailures >= 3
            );

            return Ok(new
            {
                totalSources,
                totalArticles,
                totalUsers,
                sourceHealth = new
                {
                    active = activeSources,
                    degraded = degradedSources,
                    paused = pausedSources,
                    disabled = disabledSources
                },
                articlesToday,
                failedJobs24h,
                failedSources
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard stats");
            return StatusCode(500, new { message = "Failed to get dashboard stats" });
        }
    }
}
