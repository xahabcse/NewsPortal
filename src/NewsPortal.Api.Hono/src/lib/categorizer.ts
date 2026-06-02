// Keyword-based article categorizer. Returns the category slug an article most
// likely belongs to (slugs match seed.sql); falls back to 'national'.
//
// Matching is WORD-BOUNDARY aware (Unicode, so Bangla works too): single-word
// keywords must match a whole token, not a substring. This avoids the previous
// substring false positives — e.g. "app" matching "happened", "bank" matching
// "riverbank", or "un" matching "gun" — that silently mis-filed articles.
//
// Multi-word / hyphenated keywords (e.g. "prime minister", "op-ed") are matched
// as phrases against the normalized text. Phrases score 2 (more specific); single
// tokens score 1. The weight is language-neutral, so Bangla keywords are no longer
// under-weighted relative to long English words.

type CategoryRule = {
  slug: string;
  keywords: string[]; // lowercased; single tokens match whole words, multi-word/hyphenated match as phrases
};

const RULES: CategoryRule[] = [
  {
    slug: 'politics',
    keywords: [
      'parliament', 'election', 'prime minister', 'president', 'government', 'minister', 'cabinet',
      'congress', 'senate', 'bjp', 'awami', 'bnp', 'political', 'politics', 'diplomatic', 'embassy',
      'vote', 'lawmaker', 'coalition',
      'রাজনীতি', 'সরকার', 'মন্ত্রী', 'নির্বাচন', 'প্রধানমন্ত্রী', 'সংসদ', 'রাষ্ট্রপতি', 'ভোট', 'মন্ত্রিসভা',
    ],
  },
  {
    slug: 'business',
    keywords: [
      'business', 'economy', 'stock', 'market', 'inflation', 'gdp', 'investment', 'bank', 'export',
      'import', 'trade', 'industry', 'company', 'corporate', 'finance', 'tax', 'budget', 'revenue', 'dollar',
      'stock market', 'central bank',
      'ব্যবসা', 'অর্থনীতি', 'মূল্য', 'ব্যাংক', 'রপ্তানি', 'আমদানি', 'শেয়ারবাজার', 'বাজেট', 'কর',
      'বিনিয়োগ', 'ডলার', 'রিজার্ভ', 'মুদ্রাস্ফীতি', 'রাজস্ব',
    ],
  },
  {
    slug: 'technology',
    keywords: [
      'technology', 'tech', 'software', 'ai', 'startup', 'app', 'android', 'apple', 'iphone', 'google',
      'microsoft', 'meta', 'tesla', 'crypto', 'blockchain', 'cybersecurity', 'gpu', 'chip', 'internet',
      'smartphone', 'robot', 'semiconductor',
      'artificial intelligence', 'machine learning',
      'প্রযুক্তি', 'সফটওয়্যার', 'মোবাইল', 'ইন্টারনেট', 'অ্যাপ', 'কৃত্রিম বুদ্ধিমত্তা', 'গুগল', 'স্মার্টফোন',
    ],
  },
  {
    slug: 'sports',
    keywords: [
      'cricket', 'football', 'soccer', 'tennis', 'olympic', 'fifa', 'icc', 'match', 'tournament',
      'ipl', 'bpl', 'goal', 'wicket', 'champion', 'player', 'team', 'batsman', 'bowler',
      'world cup',
      'খেলা', 'ক্রিকেট', 'ফুটবল', 'টুর্নামেন্ট', 'গোল', 'উইকেট', 'ম্যাচ', 'বিশ্বকাপ', 'ব্যাটসম্যান', 'রান',
    ],
  },
  {
    slug: 'entertainment',
    keywords: [
      'movie', 'film', 'actor', 'actress', 'music', 'song', 'singer', 'album', 'concert', 'oscar',
      'bollywood', 'hollywood', 'netflix', 'cinema', 'celebrity', 'drama',
      'বিনোদন', 'সিনেমা', 'গান', 'অভিনেতা', 'অভিনেত্রী', 'চলচ্চিত্র', 'নাটক', 'গায়ক', 'ছবি',
    ],
  },
  {
    slug: 'health',
    keywords: [
      'health', 'covid', 'vaccine', 'hospital', 'doctor', 'patient', 'disease', 'cancer', 'diabetes',
      'medicine', 'pandemic', 'virus', 'wellness', 'mental health',
      'স্বাস্থ্য', 'হাসপাতাল', 'টিকা', 'চিকিৎসক', 'রোগ', 'ওষুধ', 'ভ্যাকসিন', 'ডেঙ্গু', 'ক্যান্সার',
    ],
  },
  {
    slug: 'education',
    keywords: [
      'education', 'school', 'university', 'college', 'student', 'exam', 'curriculum', 'teacher',
      'admission', 'scholarship',
      'শিক্ষা', 'বিশ্ববিদ্যালয়', 'ছাত্র', 'পরীক্ষা', 'শিক্ষক', 'কলেজ', 'ভর্তি', 'শিক্ষার্থী',
    ],
  },
  {
    slug: 'international',
    keywords: [
      'china', 'russia', 'usa', 'america', 'europe', 'pakistan', 'india', 'palestine', 'israel',
      'ukraine', 'gaza', 'foreign', 'international', 'world', 'united nations', 'middle east',
      'আন্তর্জাতিক', 'বিদেশ', 'চীন', 'ভারত', 'যুক্তরাষ্ট্র', 'রাশিয়া', 'ইসরায়েল', 'ফিলিস্তিন', 'গাজা',
      'ইউক্রেন', 'পাকিস্তান',
    ],
  },
  {
    slug: 'opinion',
    keywords: ['opinion', 'editorial', 'op-ed', 'column', 'commentary', 'মতামত', 'সম্পাদকীয়', 'কলাম'],
  },
];

const DEFAULT_SLUG = 'national';

/** True when the keyword is a single alphanumeric token (Unicode-aware). */
function isSingleToken(keyword: string): boolean {
  return /^[\p{L}\p{N}]+$/u.test(keyword);
}

/** Split text into a Set of whole-word tokens (Latin + Bangla + digits). */
function tokenize(text: string): Set<string> {
  return new Set(text.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
}

/** Return the best-matching category slug, or 'national' as a fallback. */
export function categorize(text: string): string {
  const normalized = (text || '').normalize('NFC').toLowerCase();
  if (!normalized) return DEFAULT_SLUG;

  const tokens = tokenize(normalized);

  let bestSlug = DEFAULT_SLUG;
  let bestScore = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (isSingleToken(keyword)) {
        if (tokens.has(keyword)) score += 1; // whole-word match
      } else if (normalized.includes(keyword)) {
        score += 2; // phrase match — more specific
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSlug = rule.slug;
    }
  }

  return bestSlug;
}
