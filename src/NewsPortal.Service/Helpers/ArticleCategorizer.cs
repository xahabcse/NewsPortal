using System.Text.RegularExpressions;

namespace NewsPortal.Service.Helpers;

/// <summary>
/// Keyword-based article categorizer that maps articles to categories
/// based on title and summary content analysis.
/// Category IDs match the seeded categories in SeedData.cs.
/// </summary>
public static class ArticleCategorizer
{
    // Category IDs from SeedData.cs
    private const int National = 1;
    private const int International = 2;
    private const int Politics = 3;
    private const int Business = 4;
    private const int Technology = 5;
    private const int Sports = 6;
    private const int Entertainment = 7;
    private const int Health = 8;
    private const int Education = 9;
    private const int Opinion = 10;

    private static readonly (int CategoryId, string[] Keywords)[] CategoryRules =
    [
        (Sports, [
            "cricket", "football", "soccer", "sports", "match", "tournament", "player", "goal", "wicket",
            "batting", "bowling", "fixture", "league", "cup", "olympic", "athlete", "coach", "stadium",
            "innings", "bpl", "ipl", "fifa", "afc", "t20", "odi", "test match", "semifinal", "final",
            "ক্রিকেট", "ফুটবল", "খেলা", "খেলোয়াড়", "ম্যাচ", "টুর্নামেন্ট", "গোল", "উইকেট",
            "ব্যাটিং", "বোলিং", "অলিম্পিক", "লীগ", "কাপ", "স্টেডিয়াম", "খেলাধুলা"
        ]),
        (Technology, [
            "technology", "tech", "software", "ai", "artificial intelligence", "startup", "digital",
            "internet", "cyber", "hacking", "app", "smartphone", "robot", "automation", "blockchain",
            "programming", "data", "cloud", "5g", "gadget", "innovation",
            "প্রযুক্তি", "সফটওয়্যার", "ডিজিটাল", "ইন্টারনেট", "সাইবার", "রোবট", "অ্যাপ"
        ]),
        (Business, [
            "business", "economy", "economic", "market", "stock", "trade", "export", "import",
            "investment", "bank", "financial", "gdp", "inflation", "revenue", "profit", "company",
            "industry", "commerce", "entrepreneur", "startup", "corporate", "share", "dividend",
            "ব্যবসা", "অর্থনীতি", "বাজার", "শেয়ার", "বিনিয়োগ", "ব্যাংক", "রপ্তানি", "আমদানি",
            "মুদ্রাস্ফীতি", "জিডিপি", "মুনাফা", "কোম্পানি"
        ]),
        (Health, [
            "health", "medical", "hospital", "doctor", "disease", "vaccine", "covid", "pandemic",
            "patient", "surgery", "medicine", "who", "dengue", "cancer", "diabetes", "mental health",
            "healthcare", "clinic", "treatment", "diagnosis",
            "স্বাস্থ্য", "চিকিৎসা", "হাসপাতাল", "ডাক্তার", "রোগ", "ভ্যাকসিন", "ওষুধ", "ডেঙ্গু",
            "ক্যান্সার", "মানসিক"
        ]),
        (Education, [
            "education", "university", "school", "college", "student", "exam", "admission",
            "scholarship", "teacher", "academic", "curriculum", "hsc", "ssc", "result",
            "শিক্ষা", "বিশ্ববিদ্যালয়", "স্কুল", "কলেজ", "শিক্ষার্থী", "পরীক্ষা", "ভর্তি",
            "বৃত্তি", "শিক্ষক", "আত্মহত্যা"
        ]),
        (Entertainment, [
            "entertainment", "movie", "film", "music", "actor", "actress", "bollywood", "hollywood",
            "dhallywood", "drama", "song", "concert", "celebrity", "award", "oscar", "grammy",
            "বিনোদন", "সিনেমা", "চলচ্চিত্র", "গান", "নাটক", "অভিনেতা", "অভিনেত্রী", "পুরস্কার"
        ]),
        (Politics, [
            "politics", "political", "election", "parliament", "minister", "opposition", "government",
            "party", "vote", "democracy", "law", "bill", "legislation", "rally", "protest",
            "bnp", "awami", "jatiya", "cabinet", "mp", "senator", "congress", "president",
            "রাজনীতি", "নির্বাচন", "সংসদ", "মন্ত্রী", "সরকার", "দল", "ভোট", "গণতন্ত্র",
            "আইন", "বিরোধী", "আন্দোলন", "সমাবেশ"
        ]),
        (International, [
            "international", "global", "world", "foreign", "united nations", "un", "nato",
            "us ", "usa", "china", "russia", "india", "iran", "israel", "ukraine", "gaza",
            "palestine", "middle east", "europe", "trump", "biden", "putin", "modi",
            "war", "strike", "missile", "bomb", "military", "invasion", "sanctions",
            "আন্তর্জাতিক", "বিশ্ব", "জাতিসংঘ", "যুক্তরাষ্ট্র", "চীন", "রাশিয়া", "ভারত",
            "ইরান", "ইসরায়েল", "ইউক্রেন", "গাজা", "ফিলিস্তিন", "ট্রাম্প", "যুদ্ধ",
            "হামলা", "ক্ষেপণাস্ত্র", "সামরিক"
        ]),
        (Opinion, [
            "opinion", "editorial", "column", "perspective", "commentary", "analysis",
            "মতামত", "সম্পাদকীয়", "কলাম", "বিশ্লেষণ"
        ]),
        (National, [
            "bangladesh", "dhaka", "chittagong", "sylhet", "rajshahi", "khulna", "barishal",
            "rangpur", "mymensingh", "national", "domestic",
            "বাংলাদেশ", "ঢাকা", "চট্টগ্রাম", "সিলেট", "রাজশাহী", "খুলনা", "বরিশাল",
            "রংপুর", "ময়মনসিংহ", "জাতীয়"
        ])
    ];

    /// <summary>
    /// Determines the most likely category ID for an article based on its title and summary.
    /// Returns null if no category matches with sufficient confidence.
    /// </summary>
    public static int? Categorize(string? title, string? summary, string? sourceUrl = null)
    {
        var text = $"{title} {summary} {sourceUrl}".ToLowerInvariant();

        // Also check Bengali text without lowercasing (Bengali doesn't have case)
        var bengaliText = $"{title} {summary}";

        int bestCategory = 0;
        int bestScore = 0;

        foreach (var (categoryId, keywords) in CategoryRules)
        {
            var score = 0;
            foreach (var keyword in keywords)
            {
                // Check if keyword appears in text (case-insensitive for Latin, direct for Bengali)
                if (text.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    bengaliText.Contains(keyword, StringComparison.Ordinal))
                {
                    score++;

                    // Title match is worth more
                    if (title != null && title.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                        score += 2;
                }
            }

            if (score > bestScore)
            {
                bestScore = score;
                bestCategory = categoryId;
            }
        }

        // Require at least 1 keyword match
        return bestScore >= 1 ? bestCategory : null;
    }
}
