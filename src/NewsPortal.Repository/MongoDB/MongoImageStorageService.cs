using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using NewsPortal.Core.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using NewsPortal.Core.Monitoring;

namespace NewsPortal.Repository.MongoDB;

public class MongoImageStorageService : IImageStorageService
{
    private readonly IGridFSBucket _gridFsBucket;
    private readonly HttpClient _httpClient;
    private readonly ILogger<MongoImageStorageService> _logger;
    private const long MaxImageSizeBytes = 10 * 1024 * 1024; // 10 MB

    public MongoImageStorageService(IMongoDatabase database, HttpClient httpClient, ILogger<MongoImageStorageService> logger)
    {
        _gridFsBucket = new GridFSBucket(database);
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<string> UploadImageAsync(byte[] imageData, string fileName, string contentType)
    {
        var options = new GridFSUploadOptions
        {
            Metadata = new BsonDocument
            {
                { "contentType", contentType },
                { "uploadDate", DateTime.UtcNow }
            }
        };

        var id = await _gridFsBucket.UploadFromBytesAsync(fileName, imageData, options);

        AppMetrics.TotalImagesSaved.Inc();

        return id.ToString();
    }

    public async Task<string> UploadImageFromUrlAsync(string imageUrl, int newsArticleId)
    {
        try
        {
            // Validate URL to prevent SSRF attacks
            if (!IsValidImageUrl(imageUrl))
            {
                _logger.LogWarning("Invalid or potentially unsafe image URL rejected: {ImageUrl}", imageUrl);
                return string.Empty;
            }

            var response = await _httpClient.GetAsync(imageUrl);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to download image from {ImageUrl}. Status: {StatusCode}",
                    imageUrl, response.StatusCode);
                return string.Empty;
            }

            // Check content length before downloading
            if (response.Content.Headers.ContentLength.HasValue &&
                response.Content.Headers.ContentLength.Value > MaxImageSizeBytes)
            {
                _logger.LogWarning("Image too large ({Size} bytes) from {ImageUrl}. Max allowed: {MaxSize} bytes",
                    response.Content.Headers.ContentLength.Value, imageUrl, MaxImageSizeBytes);
                return string.Empty;
            }

            var imageData = await response.Content.ReadAsByteArrayAsync();

            // Double-check size after download (in case Content-Length was missing)
            if (imageData.Length > MaxImageSizeBytes)
            {
                _logger.LogWarning("Downloaded image exceeds size limit ({Size} bytes) from {ImageUrl}",
                    imageData.Length, imageUrl);
                return string.Empty;
            }

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
            var extension = GetExtensionFromContentType(contentType);
            var fileName = $"news_{newsArticleId}_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";

            // Get image dimensions
            using var image = Image.Load(imageData);
            var width = image.Width;
            var height = image.Height;

            var options = new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    { "contentType", contentType },
                    { "type", "original" },
                    { "postgresNewsId", newsArticleId },
                    { "originalUrl", imageUrl },
                    { "width", width },
                    { "height", height },
                    { "uploadDate", DateTime.UtcNow }
                }
            };

            var id = await _gridFsBucket.UploadFromBytesAsync(fileName, imageData, options);
            
            AppMetrics.TotalImagesSaved.Inc();

            // Generate thumbnail
            await GenerateThumbnailAsync(id.ToString(), 400, 300);

            _logger.LogInformation("Successfully uploaded image {ImageId} from {ImageUrl} for article {ArticleId}",
                id.ToString(), imageUrl, newsArticleId);

            return id.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload image from URL {ImageUrl} for article {ArticleId}",
                imageUrl, newsArticleId);
            return string.Empty;
        }
    }

    private static bool IsValidImageUrl(string url)
    {
        // Validate URL to prevent SSRF attacks
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return false;

        // Only allow HTTP and HTTPS schemes
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return false;

        // Block private IP ranges to prevent SSRF
        var host = uri.Host.ToLower();
        if (host == "localhost" || host == "127.0.0.1" || host.StartsWith("192.168.") ||
            host.StartsWith("10.") || host.StartsWith("172.16.") || host.StartsWith("172.17.") ||
            host.StartsWith("172.18.") || host.StartsWith("172.19.") || host.StartsWith("172.20.") ||
            host.StartsWith("172.21.") || host.StartsWith("172.22.") || host.StartsWith("172.23.") ||
            host.StartsWith("172.24.") || host.StartsWith("172.25.") || host.StartsWith("172.26.") ||
            host.StartsWith("172.27.") || host.StartsWith("172.28.") || host.StartsWith("172.29.") ||
            host.StartsWith("172.30.") || host.StartsWith("172.31.") || host.StartsWith("169.254."))
        {
            return false;
        }

        return true;
    }

    public async Task<(byte[] Data, string ContentType)?> GetImageAsync(string imageId)
    {
        try
        {
            var objectId = new ObjectId(imageId);
            var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", objectId);
            var fileInfo = await _gridFsBucket.Find(filter).FirstOrDefaultAsync();

            if (fileInfo == null)
            {
                _logger.LogWarning("Image not found: {ImageId}", imageId);
                return null;
            }

            var data = await _gridFsBucket.DownloadAsBytesAsync(objectId);
            var contentType = fileInfo.Metadata?.GetValue("contentType", "image/jpeg").AsString ?? "image/jpeg";

            return (data, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve image {ImageId}", imageId);
            return null;
        }
    }

    public async Task<string?> GetThumbnailIdAsync(string imageId)
    {
        try
        {
            var objectId = new ObjectId(imageId);
            var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", objectId);
            var fileInfo = await _gridFsBucket.Find(filter).FirstOrDefaultAsync();
            var thumbnailMeta = fileInfo?.Metadata?.GetValue("thumbnailId", BsonNull.Value);
            if (thumbnailMeta != null && !thumbnailMeta.IsBsonNull)
            {
                return thumbnailMeta.BsonType == BsonType.ObjectId
                    ? thumbnailMeta.AsObjectId.ToString()
                    : thumbnailMeta.AsString;
            }

            // Fallback: find thumbnail by originalId metadata when original file metadata has no thumbnailId.
            var thumbnailFilter = Builders<GridFSFileInfo>.Filter.And(
                Builders<GridFSFileInfo>.Filter.Eq("metadata.type", "thumbnail"),
                Builders<GridFSFileInfo>.Filter.Eq("metadata.originalId", imageId));

            var thumbFile = await _gridFsBucket.Find(thumbnailFilter).FirstOrDefaultAsync();
            if (thumbFile == null)
            {
                return null;
            }

            return thumbFile.Id.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get thumbnail ID for image {ImageId}", imageId);
            return null;
        }
    }

    public async Task DeleteImageAsync(string imageId)
    {
        try
        {
            var objectId = new ObjectId(imageId);

            // First get thumbnail ID and delete it
            var thumbId = await GetThumbnailIdAsync(imageId);
            if (!string.IsNullOrEmpty(thumbId))
            {
                await _gridFsBucket.DeleteAsync(new ObjectId(thumbId));
                _logger.LogInformation("Deleted thumbnail {ThumbId} for image {ImageId}", thumbId, imageId);
            }

            await _gridFsBucket.DeleteAsync(objectId);
            _logger.LogInformation("Deleted image {ImageId}", imageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete image {ImageId}", imageId);
        }
    }

    public async Task<string> GenerateThumbnailAsync(string imageId, int width, int height)
    {
        var imageResult = await GetImageAsync(imageId);
        if (imageResult == null)
            return string.Empty;

        using var image = Image.Load(imageResult.Value.Data);
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(width, height),
            Mode = ResizeMode.Max
        }));

        using var ms = new MemoryStream();
        await image.SaveAsJpegAsync(ms);
        var thumbData = ms.ToArray();

        var options = new GridFSUploadOptions
        {
            Metadata = new BsonDocument
            {
                { "contentType", "image/jpeg" },
                { "type", "thumbnail" },
                { "originalId", imageId },
                { "width", image.Width },
                { "height", image.Height },
                { "uploadDate", DateTime.UtcNow }
            }
        };

        var thumbFileName = $"thumb_{imageId}_{width}x{height}.jpg";
        var id = await _gridFsBucket.UploadFromBytesAsync(thumbFileName, thumbData, options);

        AppMetrics.TotalImagesSaved.Inc();

        return id.ToString();
    }

    private static string GetExtensionFromContentType(string contentType)
    {
        return contentType.ToLower() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            _ => ".jpg"
        };
    }
}
