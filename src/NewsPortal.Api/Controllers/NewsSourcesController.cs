using Microsoft.AspNetCore.Mvc;
using NewsPortal.Service.Services;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;
using NewsPortal.Scheduler.Jobs;

namespace NewsPortal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NewsSourcesController : ControllerBase
{
    private readonly INewsSourceService _sourceService;
    private readonly INewsFetchJob _fetchJob;

    public NewsSourcesController(INewsSourceService sourceService, INewsFetchJob fetchJob)
    {
        _sourceService = sourceService;
        _fetchJob = fetchJob;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sources = await _sourceService.GetAllSourcesAsync();
        return Ok(sources);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var source = await _sourceService.GetSourceBySlugAsync(slug);
        if (source == null) return NotFound();
        return Ok(source);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNewsSourceDto dto)
    {
        try
        {
            var source = await _sourceService.CreateSourceAsync(dto);
            return CreatedAtAction(nameof(GetBySlug), new { slug = source.Slug }, source);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateNewsSourceDto dto)
    {
        try
        {
            await _sourceService.UpdateSourceAsync(id, dto);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _sourceService.DeleteSourceAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id}/fetch")]
    public async Task<IActionResult> FetchNews(int id)
    {
        try
        {
            // Trigger fetch for this specific source
            await _fetchJob.FetchSourceAsync(id);
            return Ok(new { message = "News fetch completed successfully", sourceId = id });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
