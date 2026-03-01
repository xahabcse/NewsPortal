using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using NewsPortal.Core.Interfaces;
using NewsPortal.Service.Helpers;

namespace NewsPortal.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class AiController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public AiController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Generate an extractive summary of an article using TF-IDF sentence scoring.
    /// </summary>
    [HttpPost("summarize/{articleId}")]
    public async Task<IActionResult> SummarizeArticle(int articleId, [FromQuery] int sentences = 3, [FromQuery] string mode = "paragraph")
    {
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(articleId);
        if (article == null) return NotFound(new { message = "Article not found" });

        var text = article.PlainText ?? article.Content ?? article.Summary;
        if (string.IsNullOrWhiteSpace(text))
            return Ok(new { summary = article.Summary ?? "No content available to summarize.", bullets = Array.Empty<string>() });

        // Strip HTML tags for clean text processing
        var cleanText = System.Text.RegularExpressions.Regex.Replace(text, "<[^>]+>", " ");
        cleanText = System.Text.RegularExpressions.Regex.Replace(cleanText, @"\s+", " ").Trim();

        var allSentences = SplitSentences(cleanText);
        if (allSentences.Count <= sentences)
        {
            return Ok(new
            {
                summary = cleanText,
                bullets = allSentences,
                sentenceCount = allSentences.Count
            });
        }

        // TF-IDF extractive summarization
        var scored = ScoreSentences(allSentences);
        var topSentences = scored
            .OrderByDescending(s => s.Score)
            .Take(sentences)
            .OrderBy(s => s.Index) // Preserve original order
            .ToList();

        var summaryText = string.Join(" ", topSentences.Select(s => s.Sentence.Trim()));
        var bullets = topSentences.Select(s => s.Sentence.Trim()).ToList();

        return Ok(new
        {
            summary = summaryText,
            bullets,
            sentenceCount = allSentences.Count
        });
    }

    /// <summary>
    /// Auto-categorize an article using keyword-based classification.
    /// </summary>
    [HttpPost("categorize/{articleId}")]
    public async Task<IActionResult> CategorizeArticle(int articleId)
    {
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(articleId);
        if (article == null) return NotFound(new { message = "Article not found" });

        var suggestedCategoryId = ArticleCategorizer.Categorize(article.Title, article.Summary, article.SourceUrl);

        string? categoryName = null;
        if (suggestedCategoryId.HasValue)
        {
            article.CategoryId = suggestedCategoryId;
            await _unitOfWork.NewsArticles.UpdateAsync(article);
            await _unitOfWork.SaveChangesAsync();

            var category = await _unitOfWork.Categories.GetByIdAsync(suggestedCategoryId.Value);
            categoryName = category?.Name;
        }

        return Ok(new
        {
            articleId,
            suggestedCategoryId,
            categoryName,
            applied = suggestedCategoryId.HasValue,
            message = suggestedCategoryId.HasValue ? $"Categorized as {categoryName}" : "No matching category found"
        });
    }

    /// <summary>
    /// Bulk auto-categorize uncategorized articles.
    /// </summary>
    [HttpPost("categorize/bulk")]
    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> BulkCategorize([FromQuery] int limit = 100)
    {
        var uncategorized = await _unitOfWork.NewsArticles.FindAsync(a => a.CategoryId == null && a.IsActive);
        var articles = uncategorized.Take(limit).ToList();

        var categorized = 0;
        foreach (var article in articles)
        {
            var categoryId = ArticleCategorizer.Categorize(article.Title, article.Summary, article.SourceUrl);
            if (categoryId.HasValue)
            {
                article.CategoryId = categoryId;
                await _unitOfWork.NewsArticles.UpdateAsync(article);
                categorized++;
            }
        }

        await _unitOfWork.SaveChangesAsync();
        return Ok(new { total = articles.Count, categorized, skipped = articles.Count - categorized });
    }

    /// <summary>
    /// Analyze sentiment of comments on an article.
    /// </summary>
    [HttpGet("sentiment/article/{articleId}")]
    public async Task<IActionResult> GetArticleSentiment(int articleId)
    {
        var comments = await _unitOfWork.Comments.GetByArticleAsync(articleId);
        var activeComments = comments.Where(c => !c.IsDeleted).ToList();

        if (activeComments.Count == 0)
            return Ok(new { positive = 0, negative = 0, neutral = 0, total = 0, overallSentiment = "neutral", details = Array.Empty<object>() });

        var details = activeComments.Select(c =>
        {
            var (sentiment, score) = AnalyzeSentiment(c.Content);
            return new { commentId = c.Id, sentiment, score };
        }).ToList();

        var positive = details.Count(d => d.sentiment == "positive");
        var negative = details.Count(d => d.sentiment == "negative");
        var neutral = details.Count(d => d.sentiment == "neutral");

        var overallSentiment = positive > negative ? "positive" : negative > positive ? "negative" : "neutral";

        return Ok(new
        {
            positive,
            negative,
            neutral,
            total = activeComments.Count,
            overallSentiment,
            details
        });
    }

    /// <summary>
    /// Translate article content using MyMemory free translation API.
    /// </summary>
    [HttpPost("translate/{articleId}")]
    public async Task<IActionResult> TranslateArticle(int articleId, [FromQuery] string target = "bn")
    {
        var article = await _unitOfWork.NewsArticles.GetByIdAsync(articleId);
        if (article == null) return NotFound(new { message = "Article not found" });

        // Detect source language (simple heuristic: Bengali chars = bn, else en)
        var title = article.Title;
        var hasBengali = title.Any(c => c >= '\u0980' && c <= '\u09FF');
        var sourceLang = hasBengali ? "bn" : "en";

        // If source and target are same, return original
        if (sourceLang == target)
            return Ok(new { title = article.Title, summary = article.Summary, sourceLang, targetLang = target, message = "Article is already in the target language" });

        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };

        var translatedTitle = await TranslateText(httpClient, article.Title, sourceLang, target);
        var translatedSummary = !string.IsNullOrWhiteSpace(article.Summary)
            ? await TranslateText(httpClient, article.Summary, sourceLang, target)
            : null;

        return Ok(new
        {
            title = translatedTitle,
            summary = translatedSummary,
            sourceLang,
            targetLang = target
        });
    }

    #region Private Helpers

    private static List<string> SplitSentences(string text)
    {
        // Handle both English and Bengali sentence boundaries
        var sentences = System.Text.RegularExpressions.Regex.Split(text, @"(?<=[.!?।])\s+")
            .Select(s => s.Trim())
            .Where(s => s.Length > 15) // Filter out very short fragments
            .ToList();
        return sentences;
    }

    private static List<(int Index, string Sentence, double Score)> ScoreSentences(List<string> sentences)
    {
        // Build word frequency map (TF)
        var wordFreq = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var sentence in sentences)
        {
            var words = System.Text.RegularExpressions.Regex.Split(sentence.ToLowerInvariant(), @"\W+")
                .Where(w => w.Length > 2);
            foreach (var word in words)
            {
                wordFreq[word] = wordFreq.GetValueOrDefault(word) + 1;
            }
        }

        // Score each sentence
        var scored = new List<(int Index, string Sentence, double Score)>();
        for (var i = 0; i < sentences.Count; i++)
        {
            var words = System.Text.RegularExpressions.Regex.Split(sentences[i].ToLowerInvariant(), @"\W+")
                .Where(w => w.Length > 2).ToList();

            if (words.Count == 0) { scored.Add((i, sentences[i], 0)); continue; }

            // TF-IDF-like score
            var score = words.Sum(w => wordFreq.GetValueOrDefault(w)) / (double)words.Count;

            // Position bonus: first and last sentences often important
            if (i == 0) score *= 1.5;
            else if (i == sentences.Count - 1) score *= 1.2;

            // Length bonus: prefer medium-length sentences
            if (words.Count >= 8 && words.Count <= 30) score *= 1.1;

            scored.Add((i, sentences[i], score));
        }

        return scored;
    }

    private static readonly string[] PositiveWords =
    [
        "good", "great", "excellent", "amazing", "awesome", "wonderful", "fantastic",
        "love", "perfect", "best", "brilliant", "outstanding", "helpful", "thanks",
        "thank", "appreciate", "agree", "well", "nice", "correct", "informative",
        "ভালো", "দুর্দান্ত", "অসাধারণ", "সুন্দর", "চমৎকার", "ধন্যবাদ", "সঠিক"
    ];

    private static readonly string[] NegativeWords =
    [
        "bad", "terrible", "awful", "horrible", "poor", "worst", "hate",
        "disgusting", "annoying", "useless", "rubbish", "wrong", "disagree",
        "fake", "biased", "misleading", "propaganda", "stupid", "nonsense",
        "খারাপ", "ভয়ানক", "নিম্নমানের", "ভুল", "মিথ্যা", "বাজে", "অসম্মত"
    ];

    private static (string sentiment, double score) AnalyzeSentiment(string text)
    {
        var lower = text.ToLowerInvariant();
        var positiveCount = PositiveWords.Count(w => lower.Contains(w, StringComparison.OrdinalIgnoreCase));
        var negativeCount = NegativeWords.Count(w => lower.Contains(w, StringComparison.OrdinalIgnoreCase));

        // Also check Bengali text directly
        positiveCount += PositiveWords.Count(w => text.Contains(w, StringComparison.Ordinal) && w.Any(c => c >= '\u0980'));
        negativeCount += NegativeWords.Count(w => text.Contains(w, StringComparison.Ordinal) && w.Any(c => c >= '\u0980'));

        var total = positiveCount + negativeCount;
        if (total == 0) return ("neutral", 0.0);

        var score = (double)(positiveCount - negativeCount) / total;
        var sentiment = score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";
        return (sentiment, Math.Round(score, 2));
    }

    private static async Task<string> TranslateText(HttpClient client, string text, string sourceLang, string targetLang)
    {
        try
        {
            // Truncate long texts (MyMemory has a 500 char limit per request)
            var chunk = text.Length > 450 ? text[..450] + "..." : text;
            var encoded = Uri.EscapeDataString(chunk);
            var url = $"https://api.mymemory.translated.net/get?q={encoded}&langpair={sourceLang}|{targetLang}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return text;

            var json = await response.Content.ReadAsStringAsync();
            // Parse JSON manually to avoid extra dependencies
            var match = System.Text.RegularExpressions.Regex.Match(json, "\"translatedText\"\\s*:\\s*\"([^\"]+)\"");
            if (match.Success)
            {
                var translated = match.Groups[1].Value;
                // Unescape common JSON escape sequences
                translated = translated.Replace("\\n", "\n").Replace("\\\"", "\"").Replace("\\/", "/");
                return translated;
            }

            return text;
        }
        catch
        {
            return text; // Return original on failure
        }
    }

    #endregion
}
