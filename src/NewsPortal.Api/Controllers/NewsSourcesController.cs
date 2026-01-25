using Microsoft.AspNetCore.Mvc;
using NewsPortal.Application.Services;
using NewsPortal.Core.DTOs;
using NewsPortal.Core.Entities;

namespace NewsPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NewsSourcesController : ControllerBase
{
    private readonly INewsSourceService _sourceService;

    public NewsSourcesController(INewsSourceService sourceService)
    {
        _sourceService = sourceService;
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
}
