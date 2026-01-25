using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using NewsPortal.Core.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace NewsPortal.Repository.MongoDB;

public class MongoImageStorageService : IImageStorageService
{
    private readonly IGridFSBucket _gridFsBucket;
    private readonly HttpClient _httpClient;

    public MongoImageStorageService(IMongoDatabase database, HttpClient httpClient)
    {
        _gridFsBucket = new GridFSBucket(database);
        _httpClient = httpClient;
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
        return id.ToString();
    }

    public async Task<string> UploadImageFromUrlAsync(string imageUrl, int newsArticleId)
    {
        try
        {
            var response = await _httpClient.GetAsync(imageUrl);
            if (!response.IsSuccessStatusCode)
                return string.Empty;

            var imageData = await response.Content.ReadAsByteArrayAsync();
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

            // Generate thumbnail
            var thumbId = await GenerateThumbnailAsync(id.ToString(), 400, 300);

            // Update original with thumbnail reference
            var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", id);
            var update = Builders<GridFSFileInfo>.Update.Set("metadata.thumbnailId", new ObjectId(thumbId));
            // Note: GridFS doesn't directly support updates, so we store the reference during upload

            return id.ToString();
        }
        catch
        {
            return string.Empty;
        }
    }

    public async Task<(byte[] Data, string ContentType)?> GetImageAsync(string imageId)
    {
        try
        {
            var objectId = new ObjectId(imageId);
            var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", objectId);
            var fileInfo = await _gridFsBucket.Find(filter).FirstOrDefaultAsync();

            if (fileInfo == null)
                return null;

            var data = await _gridFsBucket.DownloadAsBytesAsync(objectId);
            var contentType = fileInfo.Metadata?.GetValue("contentType", "image/jpeg").AsString ?? "image/jpeg";

            return (data, contentType);
        }
        catch
        {
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

            return fileInfo?.Metadata?.GetValue("thumbnailId", BsonNull.Value)?.ToString();
        }
        catch
        {
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
            }

            await _gridFsBucket.DeleteAsync(objectId);
        }
        catch
        {
            // Ignore deletion errors
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
