// Keyword-based article categorizer — TypeScript port of ArticleCategorizer.cs.
// Returns the category slug (matches seed.sql) the article most likely belongs to.

type CategoryRule = {
  slug: string;
  keywords: string[]; // lowercased keywords to count
};

const RULES: CategoryRule[] = [
  {
    slug: 'politics',
    keywords: [
      'parliament', 'election', 'prime minister', 'president', 'government', 'minister', 'cabinet',
      'congress', 'senate', 'bjp', 'awami', 'bnp', 'political', 'politics', 'diplomatic', 'embassy',
      'রাজনীতি', 'সরকার', 'মন্ত্রী', 'নির্বাচন', 'প্রধানমন্ত্রী',
    ],
  },
  {
    slug: 'business',
    keywords: [
      'business', 'economy', 'stock', 'market', 'inflation', 'gdp', 'investment', 'bank', 'export',
      'import', 'trade', 'industry', 'company', 'corporate', 'finance', 'tax', 'budget',
      'ব্যবসা', 'অর্থনীতি', 'মূল্য', 'ব্যাংক', 'রপ্তানি', 'আমদানি',
    ],
  },
  {
    slug: 'technology',
    keywords: [
      'technology', 'tech', 'software', 'ai ', 'artificial intelligence', 'machine learning', 'startup',
      'app', 'android', 'apple', 'iphone', 'google', 'microsoft', 'meta', 'tesla', 'crypto',
      'blockchain', 'cybersecurity', 'data', 'gpu', 'chip', 'প্রযুক্তি', 'সফটওয়্যার',
    ],
  },
  {
    slug: 'sports',
    keywords: [
      'cricket', 'football', 'soccer', 'tennis', 'olympic', 'fifa', 'icc', 'match', 'tournament',
      'world cup', 'ipl', 'bpl', 'goal', 'wicket', 'champion', 'player', 'team',
      'খেলা', 'ক্রিকেট', 'ফুটবল', 'টুর্নামেন্ট',
    ],
  },
  {
    slug: 'entertainment',
    keywords: [
      'movie', 'film', 'actor', 'actress', 'music', 'song', 'singer', 'album', 'concert', 'oscar',
      'bollywood', 'hollywood', 'netflix', 'cinema', 'celebrity', 'বিনোদন', 'সিনেমা', 'গান',
    ],
  },
  {
    slug: 'health',
    keywords: [
      'health', 'covid', 'vaccine', 'hospital', 'doctor', 'patient', 'disease', 'cancer', 'diabetes',
      'medicine', 'pandemic', 'virus', 'mental health', 'wellness', 'স্বাস্থ্য', 'হাসপাতাল', 'টিকা',
    ],
  },
  {
    slug: 'education',
    keywords: [
      'education', 'school', 'university', 'college', 'student', 'exam', 'curriculum', 'teacher',
      'admission', 'scholarship', 'শিক্ষা', 'বিশ্ববিদ্যালয়', 'ছাত্র', 'পরীক্ষা',
    ],
  },
  {
    slug: 'international',
    keywords: [
      'china', 'russia', 'usa', 'america', 'europe', 'united nations', 'un ', 'pakistan', 'india',
      'middle east', 'palestine', 'israel', 'ukraine', 'gaza', 'foreign', 'international', 'world',
      'আন্তর্জাতিক', 'বিদেশ',
    ],
  },
  {
    slug: 'opinion',
    keywords: ['opinion', 'editorial', 'op-ed', 'column', 'commentary', 'মতামত', 'সম্পাদকীয়'],
  },
];

const DEFAULT_SLUG = 'national';

/** Return the best-matching category slug, or 'national' as a fallback. */
export function categorize(text: string): string {
  const lower = (text || '').toLowerCase();
  if (!lower) return DEFAULT_SLUG;

  let bestSlug = DEFAULT_SLUG;
  let bestScore = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) score += kw.length > 6 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestSlug = rule.slug;
    }
  }
  return bestSlug;
}
