using System.Security.Claims;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Entities;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ReportsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private int GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    [HttpPost("article/{articleId}")]
    [Authorize]
    public async Task<IActionResult> ReportArticle(int articleId, [FromBody] ReportRequest request)
    {
        if (!ReportReasons.All.Contains(request.Reason))
            return BadRequest(new { message = "Invalid report reason" });

        var userId = GetUserId();

        // Check if user already reported this article
        var existing = await _unitOfWork.ArticleReports.GetByUserAndArticleAsync(userId, articleId);
        if (existing != null)
            return BadRequest(new { message = "You have already reported this article" });

        await _unitOfWork.ArticleReports.AddAsync(new ArticleReport
        {
            UserId = userId,
            ArticleId = articleId,
            Reason = request.Reason,
            Details = request.Details?.Trim()
        });

        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Report submitted successfully" });
    }

    [HttpGet("article/{articleId}/status")]
    [Authorize]
    public async Task<IActionResult> GetReportStatus(int articleId)
    {
        var userId = GetUserId();
        var existing = await _unitOfWork.ArticleReports.GetByUserAndArticleAsync(userId, articleId);
        return Ok(new { reported = existing != null, reason = existing?.Reason, status = existing?.Status });
    }

    [HttpGet("admin/pending")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetPendingReports([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var reports = await _unitOfWork.ArticleReports.GetPendingReportsAsync(page, pageSize);
        var count = await _unitOfWork.ArticleReports.GetPendingCountAsync();

        return Ok(new
        {
            items = reports.Select(r => new
            {
                r.Id,
                r.ArticleId,
                articleTitle = r.Article?.Title,
                reporterUsername = r.User?.Username,
                r.Reason,
                r.Details,
                r.Status,
                r.CreatedAt
            }),
            totalCount = count,
            page,
            pageSize
        });
    }

    [HttpPut("admin/{reportId}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> UpdateReportStatus(int reportId, [FromBody] UpdateReportRequest request)
    {
        var report = await _unitOfWork.ArticleReports.GetByIdAsync(reportId);
        if (report == null)
            return NotFound(new { message = "Report not found" });

        if (request.Status != ReportStatus.Reviewed && request.Status != ReportStatus.Dismissed)
            return BadRequest(new { message = "Invalid status" });

        report.Status = request.Status;
        await _unitOfWork.ArticleReports.UpdateAsync(report);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Report status updated" });
    }
}

public class ReportRequest
{
    public string Reason { get; set; } = "incorrect";
    public string? Details { get; set; }
}

public class UpdateReportRequest
{
    public string Status { get; set; } = "reviewed";
}
