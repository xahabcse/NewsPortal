// Bangla digit map
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

// Gregorian months in Bangla
const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
]

const BANGLA_DAYS = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার',
]

// Bengali calendar months (বঙ্গাব্দ)
const BENGALI_CAL_MONTHS = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র',
]

// Bengali month start dates (Gregorian): [gregorianMonth (0-based), gregorianDay].
// Aligned to the official Bangladesh revised calendar (Bangla Academy, 2019):
// Pohela Boishakh is fixed on 14 April; the first six months (Boishakh–Ashwin)
// are 31 days, the next five (Kartik–Falgun) are 30 (Falgun 29, +1 in a leap
// year), and Choitro is 30 — which keeps every month-start on a fixed Gregorian
// date year-round. Sorted by Gregorian calendar order (Jan → Dec).
const BENGALI_MONTH_MAP = [
  { gMonth: 0, gDay: 15, bIndex: 9 },   // মাঘ — Jan 15
  { gMonth: 1, gDay: 14, bIndex: 10 },  // ফাল্গুন — Feb 14
  { gMonth: 2, gDay: 15, bIndex: 11 },  // চৈত্র — Mar 15
  { gMonth: 3, gDay: 14, bIndex: 0 },   // বৈশাখ — Apr 14
  { gMonth: 4, gDay: 15, bIndex: 1 },   // জ্যৈষ্ঠ — May 15
  { gMonth: 5, gDay: 15, bIndex: 2 },   // আষাঢ় — Jun 15
  { gMonth: 6, gDay: 16, bIndex: 3 },   // শ্রাবণ — Jul 16
  { gMonth: 7, gDay: 16, bIndex: 4 },   // ভাদ্র — Aug 16
  { gMonth: 8, gDay: 16, bIndex: 5 },   // আশ্বিন — Sep 16
  { gMonth: 9, gDay: 17, bIndex: 6 },   // কার্তিক — Oct 17
  { gMonth: 10, gDay: 16, bIndex: 7 },  // অগ্রহায়ণ — Nov 16
  { gMonth: 11, gDay: 16, bIndex: 8 },  // পৌষ — Dec 16
]

// Hijri months in Bangla
const HIJRI_MONTHS_BANGLA = [
  'মহররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি',
  'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান',
  'রমজান', 'শাওয়াল', 'জিলক্বদ', 'জিলহজ্জ',
]

// Bengali seasons (ঋতু) — mapped by Bengali month index (0-11)
const RITU_MAP: { name: string; emoji: string }[] = [
  { name: 'গ্রীষ্মকাল', emoji: '🌞' },   // বৈশাখ
  { name: 'গ্রীষ্মকাল', emoji: '🌞' },   // জ্যৈষ্ঠ
  { name: 'বর্ষাকাল', emoji: '🌧️' },    // আষাঢ়
  { name: 'বর্ষাকাল', emoji: '🌧️' },    // শ্রাবণ
  { name: 'শরৎকাল', emoji: '🌾' },      // ভাদ্র
  { name: 'শরৎকাল', emoji: '🌾' },      // আশ্বিন
  { name: 'হেমন্তকাল', emoji: '🍂' },   // কার্তিক
  { name: 'হেমন্তকাল', emoji: '🍂' },   // অগ্রহায়ণ
  { name: 'শীতকাল', emoji: '❄️' },      // পৌষ
  { name: 'শীতকাল', emoji: '❄️' },      // মাঘ
  { name: 'বসন্তকাল', emoji: '🌸' },    // ফাল্গুন
  { name: 'বসন্তকাল', emoji: '🌸' },    // চৈত্র
]

// --- Helpers ---

export function toBanglaDigits(num: number): string {
  return String(num).replace(/\d/g, d => BANGLA_DIGITS[parseInt(d)])
}

export function getBanglaDay(date: Date): string {
  return BANGLA_DAYS[date.getDay()]
}

// --- Gregorian date in Bangla ---

export function getBanglaDate(date: Date): string {
  return `${toBanglaDigits(date.getDate())} ${BANGLA_MONTHS[date.getMonth()]} ${toBanglaDigits(date.getFullYear())}`
}

// --- Bengali Calendar (বঙ্গাব্দ) ---

function getBengaliMonthIndex(date: Date): number {
  const gMonth = date.getMonth()
  const gDay = date.getDate()

  for (let i = BENGALI_MONTH_MAP.length - 1; i >= 0; i--) {
    const entry = BENGALI_MONTH_MAP[i]
    if (gMonth > entry.gMonth || (gMonth === entry.gMonth && gDay >= entry.gDay)) {
      return entry.bIndex
    }
  }
  // Before Jan 15 (i.e. still পৌষ, which began Dec 16 of the previous year)
  return 8
}

export function getBengaliCalendarDate(date: Date): string {
  const gMonth = date.getMonth()
  const gDay = date.getDate()
  const gYear = date.getFullYear()

  let bMonthName: string
  let bDay: number

  // Find which Bengali month entry matches
  let foundEntry = null
  for (let i = BENGALI_MONTH_MAP.length - 1; i >= 0; i--) {
    const entry = BENGALI_MONTH_MAP[i]
    if (gMonth > entry.gMonth || (gMonth === entry.gMonth && gDay >= entry.gDay)) {
      foundEntry = entry
      break
    }
  }

  if (foundEntry) {
    const start = new Date(gYear, foundEntry.gMonth, foundEntry.gDay)
    bDay = Math.floor((date.getTime() - start.getTime()) / 86400000) + 1
    bMonthName = BENGALI_CAL_MONTHS[foundEntry.bIndex]
  } else {
    // Before Jan 15 → still পৌষ, which began Dec 16 of the previous year
    const start = new Date(gYear - 1, 11, 16)
    bDay = Math.floor((date.getTime() - start.getTime()) / 86400000) + 1
    bMonthName = 'পৌষ'
  }

  // Bengali year: বৈশাখ (Apr 14) starts new year
  const bYear = (gMonth > 3 || (gMonth === 3 && gDay >= 14)) ? gYear - 593 : gYear - 594

  return `${toBanglaDigits(bDay)} ${bMonthName} ${toBanglaDigits(bYear)}`
}

// --- Hijri Calendar (হিজরি) ---

export function getHijriDate(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(date)

    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1')
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1')
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '1')

    return `${toBanglaDigits(day)} ${HIJRI_MONTHS_BANGLA[month - 1]} ${toBanglaDigits(year)}`
  } catch {
    return ''
  }
}

// --- Bengali Season (ঋতু) ---

export function getBanglaRitu(date: Date): { name: string; emoji: string } {
  const monthIndex = getBengaliMonthIndex(date)
  return RITU_MAP[monthIndex]
}

// --- Session / Time of Day ---

export interface SessionInfo {
  bangla: string
  emoji: string
  greeting: string
}

export function getSession(hour: number): SessionInfo {
  if (hour >= 4 && hour < 6) return { bangla: 'ভোর', emoji: '🌅', greeting: 'শুভ ভোর' }
  if (hour >= 6 && hour < 12) return { bangla: 'সকাল', emoji: '☀️', greeting: 'শুভ সকাল' }
  if (hour >= 12 && hour < 15) return { bangla: 'দুপুর', emoji: '🌤️', greeting: 'শুভ দুপুর' }
  if (hour >= 15 && hour < 17) return { bangla: 'বিকেল', emoji: '🌇', greeting: 'শুভ বিকেল' }
  if (hour >= 17 && hour < 19) return { bangla: 'সন্ধ্যা', emoji: '🌆', greeting: 'শুভ সন্ধ্যা' }
  return { bangla: 'রাত', emoji: '🌙', greeting: 'শুভ রাত্রি' }
}
