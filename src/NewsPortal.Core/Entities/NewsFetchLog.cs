using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace NewsPortal.Core.Entities;

public class NewsFetchLog
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string SourceName { get; set; } = string.Empty;

    public int SourceId { get; set; }

    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;

    public int ArticlesFetched { get; set; }

    public int NewArticles { get; set; }

    public int UpdatedArticles { get; set; }

    public bool Success { get; set; }

    public string? ErrorMessage { get; set; }

    public TimeSpan Duration { get; set; }

    public string? Details { get; set; }
}
