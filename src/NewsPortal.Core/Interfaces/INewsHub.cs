namespace NewsPortal.Core.Interfaces;

public interface INewsHub
{
    Task NewArticleAvailable(int articleId, string title, string categoryName);
    Task BreakingNews(string title);
}
