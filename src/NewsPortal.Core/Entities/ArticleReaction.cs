namespace NewsPortal.Core.Entities;

public class ArticleReaction : BaseEntity
{
    public int UserId { get; set; }
    public int ArticleId { get; set; }
    public string ReactionType { get; set; } = "like"; // like, love, informative, shocking

    public virtual User User { get; set; } = default!;
    public virtual NewsArticle Article { get; set; } = default!;
}

public static class ReactionTypes
{
    public const string Like = "like";
    public const string Love = "love";
    public const string Informative = "informative";
    public const string Shocking = "shocking";

    public static readonly string[] All = { Like, Love, Informative, Shocking };
}
