using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;

namespace NewsPortal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LogsController : ControllerBase
{
    private readonly ILogger<LogsController> _logger;
    private readonly string _logsDirectory;

    public LogsController(ILogger<LogsController> logger, IConfiguration configuration)
    {
        _logger = logger;
        _logsDirectory = configuration["LogsDirectory"] ?? "logs";
    }

    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] string? level = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? date = null)
    {
        try
        {
            var logs = new List<LogEntry>();
            var logsPath = Path.Combine(Directory.GetCurrentDirectory(), _logsDirectory);

            if (!Directory.Exists(logsPath))
            {
                return Ok(new PagedLogResult
                {
                    Items = new List<LogEntry>(),
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0
                });
            }

            // Get log files (today's or specific date)
            var pattern = date != null
                ? $"*{date}*.log"
                : "*.log";

            var logFiles = Directory.GetFiles(logsPath, pattern, SearchOption.TopDirectoryOnly)
                .OrderByDescending(f => new FileInfo(f).LastWriteTime)
                .Take(5); // Limit to 5 most recent files

            foreach (var file in logFiles)
            {
                var lines = await System.IO.File.ReadAllLinesAsync(file);
                logs.AddRange(ParseLogFile(lines, Path.GetFileName(file)));
            }

            // Apply filters
            var filteredLogs = logs.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(level))
            {
                filteredLogs = filteredLogs.Where(l => l.Level.Equals(level, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                filteredLogs = filteredLogs.Where(l =>
                    l.Message.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    l.Exception?.Contains(search, StringComparison.OrdinalIgnoreCase) == true);
            }

            var orderedLogs = filteredLogs.OrderByDescending(l => l.Timestamp).ToList();
            var totalCount = orderedLogs.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var pagedLogs = orderedLogs
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return Ok(new PagedLogResult
            {
                Items = pagedLogs,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                HasNextPage = page < totalPages,
                HasPreviousPage = page > 1
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading logs");
            return StatusCode(500, new { error = "Failed to read logs", details = ex.Message });
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetLogStats()
    {
        try
        {
            var logsPath = Path.Combine(Directory.GetCurrentDirectory(), _logsDirectory);

            if (!Directory.Exists(logsPath))
            {
                return Ok(new LogStats
                {
                    TotalLogs = 0,
                    ErrorCount = 0,
                    WarningCount = 0,
                    InfoCount = 0,
                    LastUpdated = DateTime.UtcNow
                });
            }

            var logFiles = Directory.GetFiles(logsPath, "*.log", SearchOption.TopDirectoryOnly)
                .OrderByDescending(f => new FileInfo(f).LastWriteTime)
                .Take(5);

            var logs = new List<LogEntry>();
            foreach (var file in logFiles)
            {
                var lines = await System.IO.File.ReadAllLinesAsync(file);
                logs.AddRange(ParseLogFile(lines, Path.GetFileName(file)));
            }

            return Ok(new LogStats
            {
                TotalLogs = logs.Count,
                ErrorCount = logs.Count(l => l.Level.Equals("Error", StringComparison.OrdinalIgnoreCase) ||
                                            l.Level.Equals("Fatal", StringComparison.OrdinalIgnoreCase)),
                WarningCount = logs.Count(l => l.Level.Equals("Warning", StringComparison.OrdinalIgnoreCase)),
                InfoCount = logs.Count(l => l.Level.Equals("Information", StringComparison.OrdinalIgnoreCase)),
                LastUpdated = logs.Any() ? logs.Max(l => l.Timestamp) : DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting log stats");
            return StatusCode(500, new { error = "Failed to get log stats" });
        }
    }

    private List<LogEntry> ParseLogFile(string[] lines, string fileName)
    {
        var logs = new List<LogEntry>();
        // Serilog default format: 2025-01-25 10:30:45.123 +00:00 [INF] Message
        var pattern = @"^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3})\s[+-]\d{2}:\d{2}\s\[([A-Z]{3})\]\s(.+)$";
        var regex = new Regex(pattern);

        // Map Serilog short level names to full names
        var levelMap = new Dictionary<string, string>
        {
            { "VRB", "Verbose" },
            { "DBG", "Debug" },
            { "INF", "Information" },
            { "WRN", "Warning" },
            { "ERR", "Error" },
            { "FTL", "Fatal" }
        };

        LogEntry? currentLog = null;

        foreach (var line in lines)
        {
            var match = regex.Match(line);
            if (match.Success)
            {
                // Save previous log if exists
                if (currentLog != null)
                {
                    logs.Add(currentLog);
                }

                var levelShort = match.Groups[2].Value;
                var levelFull = levelMap.ContainsKey(levelShort) ? levelMap[levelShort] : levelShort;

                // Start new log entry
                currentLog = new LogEntry
                {
                    Timestamp = DateTime.Parse(match.Groups[1].Value),
                    Level = levelFull,
                    Message = match.Groups[3].Value,
                    Source = fileName
                };
            }
            else if (currentLog != null)
            {
                // Multi-line log (exception or stack trace)
                currentLog.Exception = (currentLog.Exception ?? "") + "\n" + line;
            }
        }

        // Add the last log
        if (currentLog != null)
        {
            logs.Add(currentLog);
        }

        return logs;
    }
}

public class LogEntry
{
    public DateTime Timestamp { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string Source { get; set; } = string.Empty;
}

public class PagedLogResult
{
    public List<LogEntry> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
}

public class LogStats
{
    public int TotalLogs { get; set; }
    public int ErrorCount { get; set; }
    public int WarningCount { get; set; }
    public int InfoCount { get; set; }
    public DateTime LastUpdated { get; set; }
}
