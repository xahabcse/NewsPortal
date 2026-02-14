using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Api.Controllers;

[ApiController]
[Route("api/images")]
public class ImagesController : ControllerBase
{
    private readonly IImageStorageService _imageStorageService;

    public ImagesController(IImageStorageService imageStorageService)
    {
        _imageStorageService = imageStorageService;
    }

    [HttpGet("{imageId}")]
    public async Task<IActionResult> GetImage(string imageId)
    {
        var image = await _imageStorageService.GetImageAsync(imageId);
        if (image == null)
        {
            return NotFound();
        }

        return File(image.Value.Data, image.Value.ContentType);
    }
}
