import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    CheckCircle2,
    Circle,
    Code2,
    Cpu,
    FileText,
    Globe,
    Heart,
    Layers,
    Languages,
    Mail,
    Newspaper,
    Server,
    Sparkles,
    Zap,
} from 'lucide-react';

import SEO from '../components/SEO';
import { newsApi } from '../services/api';
import { NewsSourceService } from '../services/NewsSourceService';

// lucide-react dropped its brand GitHub mark; keep an inline SVG so it renders.
function GithubMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className={className} aria-hidden>
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.77-.01 3.15 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
        </svg>
    );
}

/* ──────────────────────────────────────────────────────────────
   Data — kept inside the page so the whole About story is one file.
   Team / methodology / stack / contact are the real project info;
   product framing is NewsPortal-specific.
   ────────────────────────────────────────────────────────────── */

interface TeamMember {
    name: string;
    role: string;
    blurb: string;
    image: string;
    link?: string;
    badge: string;
    since: string;
    kind: 'human' | 'ai';
}

const TEAM: TeamMember[] = [
    {
        name: 'Md Sahabuddin Hossain',
        role: 'Founder · Engineer · Curator',
        blurb:
            'Software engineer ও bilingual builder। NewsPortal-এর পুরো pipeline — source curation, RSS/scraping ingestion, dedup, categorization, full-content extraction, এবং bilingual UI — নিজে structure করেন। লক্ষ্য একটাই: এক জায়গায় বিশ্বস্ত সব খবর, calm আর ad-free ভাবে।',
        image: 'https://avatars.githubusercontent.com/u/178742119?v=4&s=300',
        link: 'https://github.com/xujoncep',
        badge: 'Lead',
        since: 'Since 2024',
        kind: 'human',
    },
    {
        name: 'Claude (Anthropic)',
        role: 'AI Engineering Partner',
        blurb:
            'Engineering pair-programmer for the full stack — React + TypeScript frontend, Cloudflare Workers backend, D1 schema, fetch pipeline, এবং deployment infrastructure। AI proposes architecture, the engineer reviews and merges। প্রতিটা PR human-approved before shipping — accelerator, shortcut নয়।',
        image: 'https://avatars.githubusercontent.com/u/76263028?v=4&s=300',
        link: 'https://www.anthropic.com',
        badge: 'AI · Pair',
        since: 'Joined 2024',
        kind: 'ai',
    },
    {
        name: 'Codex (OpenAI)',
        role: 'AI Code Reviewer',
        blurb:
            'Independent secondary code reviewer। Architecture decisions-এ alternative perspectives, edge case identification, এবং refactor proposals দেয়। Significant change-এর আগে Claude-এর work cross-validate করা হয় — যাতে একই AI-এর bias দুটো model-এই carry না হয়।',
        image: 'https://avatars.githubusercontent.com/u/14957082?v=4&s=300',
        link: 'https://openai.com',
        badge: 'AI · Review',
        since: 'Joined 2025',
        kind: 'ai',
    },
];

interface Pillar {
    icon: React.ReactNode;
    title: string;
    body: string;
    detail: string;
}

const PILLARS: Pillar[] = [
    {
        icon: <Languages className="h-[18px] w-[18px]" />,
        title: 'Bilingual by design',
        body: 'বাংলায় খবর পড়ুন, English keywords অক্ষত।',
        detail:
            'বাংলা ও English — দুই ভাষার source একসাথে। UI পুরো bilingual, কিন্তু আমরা কোনো technical/brand keyword phonetic Bangla-তে লিখি না। প্রতিটা headline তার মূল ভাষাতেই থাকে, পড়াটা যেন স্বাভাবিক লাগে।',
    },
    {
        icon: <Layers className="h-[18px] w-[18px]" />,
        title: 'Multi-source, de-duplicated',
        body: 'বিশ্বস্ত একাধিক source, পুনরাবৃত্তি ছাড়া।',
        detail:
            'Prothom Alo, Bangla Tribune, BSS, BBC, Al Jazeera, NPR সহ একাধিক outlet থেকে খবর আনা হয়। Canonical-URL ও title-similarity দিয়ে duplicate ছেঁকে ফেলা হয় — তাই একই খবর বারবার feed-এ আসে না।',
    },
    {
        icon: <FileText className="h-[18px] w-[18px]" />,
        title: 'Full article, not just headlines',
        body: 'In-app-ই সম্পূর্ণ লেখা — tab ঘোরাঘুরি নয়।',
        detail:
            'শুধু intro নয় — আমরা প্রতিটা article-এর সম্পূর্ণ body extract করি (JSON-LD + content selector), যাতে NewsPortal-এই পুরো খবরটা পড়তে পারেন। চাইলে এক click-এ মূল উৎসেও যেতে পারবেন।',
    },
    {
        icon: <Heart className="h-[18px] w-[18px]" />,
        title: 'Calm, no ads',
        body: 'No upsell, no popup, no tracking pixel।',
        detail:
            'Clean reader experience, dark ও light mode, কোনো ad বা email-bait নেই। আমরা যা track করি (bookmark, reading history) সেটা শুধু আপনার নিজের dashboard-এর জন্য — বিজ্ঞাপন বা monetization-এর জন্য নয়।',
    },
];

interface StackItem {
    icon: React.ReactNode;
    label: string;
    desc: string;
}

interface StackGroup {
    title: string;
    items: StackItem[];
}

const STACK: StackGroup[] = [
    {
        title: 'Frontend',
        items: [
            { icon: <Code2 className="h-[14px] w-[14px]" />, label: 'React 18 + TypeScript', desc: 'Strict typing থেকে runtime safety।' },
            { icon: <Sparkles className="h-[14px] w-[14px]" />, label: 'Tailwind + Source Serif', desc: 'Token-based editorial design system।' },
            { icon: <Zap className="h-[14px] w-[14px]" />, label: 'Vite + PWA', desc: 'Fast build, offline-ready install।' },
        ],
    },
    {
        title: 'Pipeline',
        items: [
            { icon: <FileText className="h-[14px] w-[14px]" />, label: 'RSS + scraping ingestion', desc: 'একাধিক source, scheduled fetch।' },
            { icon: <Layers className="h-[14px] w-[14px]" />, label: 'HTMLRewriter + JSON-LD', desc: 'Full-content extraction, dedup, categorize।' },
        ],
    },
    {
        title: 'Backend',
        items: [
            { icon: <Cpu className="h-[14px] w-[14px]" />, label: 'Hono + Workers', desc: 'Edge-runtime API, ms cold-start।' },
            { icon: <Server className="h-[14px] w-[14px]" />, label: 'Cloudflare D1 + KV', desc: 'SQLite at the edge + KV cache।' },
        ],
    },
    {
        title: 'Infra',
        items: [
            { icon: <Globe className="h-[14px] w-[14px]" />, label: 'Cloudflare Pages', desc: 'Static-fast, free-tier friendly।' },
            { icon: <GithubMark className="h-[14px] w-[14px]" />, label: 'GitHub Actions', desc: 'Auto-deploy on push to dev।' },
        ],
    },
];

type RoadmapStatus = 'shipped' | 'in-progress' | 'planned';

interface RoadmapItem {
    status: RoadmapStatus;
    title: string;
    desc: string;
}

const ROADMAP: RoadmapItem[] = [
    {
        status: 'shipped',
        title: 'Full-content + AI summary & translate',
        desc: 'সম্পূর্ণ article in-app, এবং এক click-এ AI summary বা Bangla↔English translate।',
    },
    {
        status: 'in-progress',
        title: 'Personalized “For You” feed',
        desc: 'আপনার পড়া ও bookmark থেকে শেখা — পছন্দের category ও source অগ্রাধিকার পায়।',
    },
    {
        status: 'planned',
        title: 'Breaking-news push notifications',
        desc: 'গুরুত্বপূর্ণ খবরের জন্য opt-in push — শুধু যেটা সত্যিই দরকার।',
    },
    {
        status: 'planned',
        title: 'Saved-search alerts + more sources',
        desc: 'কোনো topic follow করলে নতুন খবর এলে জানানো, আর আরও regional outlet যোগ।',
    },
];

interface FaqItem {
    q: string;
    a: string;
}

const FAQ: FaqItem[] = [
    {
        q: 'NewsPortal কি সম্পূর্ণ free?',
        a: 'হ্যাঁ — খবর পড়া চিরকাল free। কোনো paywall, কোনো ad, কোনো trial নেই। Sign-in শুধু bookmark, reading history আর personalization-এর জন্য — পড়ার জন্য account লাগে না।',
    },
    {
        q: 'খবর কোথা থেকে আসে?',
        a: 'একাধিক বিশ্বস্ত outlet থেকে — Prothom Alo, Bangla Tribune, BSS, The Daily Star, BBC, Al Jazeera, NPR, Hindustan Times সহ। প্রতিটা source RSS/feed থেকে আনা হয়, তারপর dedup ও categorize করা হয়।',
    },
    {
        q: 'খবর কত ঘন ঘন update হয়?',
        a: 'প্রতি ৫ মিনিটে একটা scheduled fetch চলে — নতুন article এলে কিছুক্ষণের মধ্যেই feed-এ চলে আসে, পুরো body সহ।',
    },
    {
        q: 'Offline পড়া যাবে?',
        a: 'হ্যাঁ। NewsPortal একটা PWA — phone-এ “Add to Home Screen” করলে app-এর মতো চলে এবং পড়া article offline-ও cache হয়।',
    },
    {
        q: 'কেন একই খবর দুবার দেখি না?',
        a: 'প্রতিটা নতুন article-কে canonical-URL ও title-similarity দিয়ে যাচাই করা হয়। Duplicate হলে সেটা বাদ পড়ে — তাই feed পরিষ্কার থাকে।',
    },
    {
        q: 'কোনো bug বা ভুল পেলে?',
        a: 'সরাসরি email করুন বা GitHub-এ issue খুলুন। Feedback সবসময় স্বাগত — NewsPortal ছোট একটা team-এর কাজ, প্রতিটা report পড়া হয়।',
    },
];

interface NavAnchor {
    id: string;
    label: string;
}

const PAGE_NAV: NavAnchor[] = [
    { id: 'mission', label: 'Mission' },
    { id: 'numbers', label: 'Numbers' },
    { id: 'pillars', label: 'Principles' },
    { id: 'team', label: 'Team' },
    { id: 'stack', label: 'Stack' },
    { id: 'roadmap', label: 'Roadmap' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
];

/* ── Small inline components ── */

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-[0.12em] text-secondary font-medium">
            <span className="inline-block h-[1px] w-6 bg-accent/50" />
            {children}
        </div>
    );
}

function StatusPill({ status }: { status: RoadmapStatus }) {
    if (status === 'shipped') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-accent/15 text-accent border border-accent/30">
                <CheckCircle2 className="h-3 w-3" /> Shipped
            </span>
        );
    }
    if (status === 'in-progress') {
        return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/5 text-white border border-glass-border">
                <Circle className="h-3 w-3 fill-current text-accent" /> In progress
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/5 text-secondary border border-glass-border">
            <Circle className="h-3 w-3" /> Planned
        </span>
    );
}

const TrustPill = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-white/5 text-secondary border border-glass-border">
        {children}
    </span>
);

const AboutPage = () => {
    const [stats, setStats] = useState<{ sources: number; categories: number; articles: number }>({
        sources: 8,
        categories: 10,
        articles: 0,
    });

    useEffect(() => {
        let active = true;
        Promise.allSettled([
            NewsSourceService.getActive(),
            newsApi.getCategories(),
            newsApi.getLatestNews(1, 1),
        ]).then(([srcRes, catRes, newsRes]) => {
            if (!active) return;
            setStats((prev) => ({
                sources: srcRes.status === 'fulfilled' ? srcRes.value.length : prev.sources,
                categories: catRes.status === 'fulfilled' ? catRes.value.length : prev.categories,
                articles: newsRes.status === 'fulfilled' ? newsRes.value.totalCount : prev.articles,
            }));
        });
        return () => { active = false; };
    }, []);

    const NUMBERS = [
        { value: stats.sources, label: 'Sources', sub: 'trusted outlets' },
        { value: stats.categories, label: 'Categories', sub: 'topic sections' },
        { value: stats.articles ? stats.articles.toLocaleString() : '—', label: 'Articles', sub: 'in the archive' },
        { value: '2', label: 'Languages', sub: 'বাংলা + English' },
        { value: '5 min', label: 'Refresh', sub: 'scheduled fetch' },
        { value: 'Free', label: 'Cost', sub: 'no ads, ever' },
    ];

    return (
        <>
            <SEO
                title="About"
                description="The story, mission, and small team behind NewsPortal — a calm, bilingual, ad-free news aggregator."
            />

            <div className="animate-fade-in">
                {/* ── HERO ── */}
                <section className="relative overflow-hidden border-b border-glass-border">
                    <div
                        aria-hidden
                        className="absolute pointer-events-none"
                        style={{
                            left: -200, top: -240, width: 640, height: 640,
                            background: 'radial-gradient(closest-side, rgb(var(--color-accent) / 0.12), transparent 70%)',
                        }}
                    />
                    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-10 pt-10 md:pt-16 pb-12 md:pb-20 relative">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-secondary mb-8 md:mb-12">
                            <div className="flex items-center gap-3">
                                <span className="text-accent font-medium">NewsPortal · About</span>
                                <span className="hidden sm:inline text-secondary/50">·</span>
                                <span className="hidden sm:inline">A reader-first newsroom</span>
                            </div>
                            <span className="text-secondary/60">Vol. 2024 — present</span>
                        </div>

                        <div className="grid md:grid-cols-[1.15fr_1fr] gap-10 md:gap-16 items-center">
                            <div>
                                <SectionLabel>About NewsPortal</SectionLabel>
                                <h1 className="font-serif text-[38px] sm:text-[50px] md:text-[64px] leading-[1.04] tracking-[-0.025em] text-white mt-5">
                                    এক জায়গায় সব খবর — <span className="italic text-accent">calm, bilingual, ad-free</span>।
                                </h1>
                                <p className="text-[15px] sm:text-[17px] text-secondary mt-6 max-w-[580px] leading-[1.65]">
                                    NewsPortal একাধিক বিশ্বস্ত outlet থেকে বাংলা ও English খবর এক জায়গায় আনে —
                                    duplicate ছেঁকে, সম্পূর্ণ article সহ, কোনো ad বা distraction ছাড়া।
                                    শুধু পড়া, আর নিজের মতো করে খবর ফলো করা।
                                </p>

                                <div className="mt-7 flex flex-wrap gap-2">
                                    <TrustPill>{stats.sources} sources</TrustPill>
                                    <TrustPill>{stats.categories} categories</TrustPill>
                                    <TrustPill>Zero ads</TrustPill>
                                    <TrustPill>Bilingual</TrustPill>
                                    <TrustPill>Free forever</TrustPill>
                                </div>

                                <div className="mt-8 flex flex-wrap gap-3">
                                    <Link to="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/85 transition-colors">
                                        Explore the news <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link to="/news-sources" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white/5 border border-glass-border text-secondary hover:text-white hover:bg-white/10 text-sm font-semibold transition-colors">
                                        <Layers className="h-4 w-4" /> View sources
                                    </Link>
                                </div>
                            </div>

                            {/* Editorial cover card (desktop) */}
                            <div className="hidden md:block relative h-[460px]">
                                <div
                                    aria-hidden
                                    className="absolute glass-morphism rounded-2xl"
                                    style={{ inset: '28px -16px 26px 34px', transform: 'rotate(2deg)', zIndex: 0 }}
                                />
                                <div
                                    className="absolute rounded-2xl overflow-hidden border border-glass-border"
                                    style={{
                                        inset: '0 16px 0 0', zIndex: 1,
                                        background: 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--color-fg)) 78%)',
                                    }}
                                >
                                    <div
                                        aria-hidden
                                        className="absolute rounded-full"
                                        style={{ right: -150, top: -150, width: 440, height: 440, background: 'radial-gradient(closest-side, rgba(255,255,255,0.18), transparent 70%)' }}
                                    />
                                    <div className="absolute top-7 left-7 right-7 flex items-start justify-between text-[10.5px] uppercase tracking-[0.14em] text-white/80 z-10">
                                        <span>Daily edition</span>
                                        <span className="text-white/60">No. 01 / ∞</span>
                                    </div>
                                    <div className="relative h-full p-9 pt-20 flex flex-col justify-end text-white">
                                        <Newspaper className="h-9 w-9 mb-5 text-white/90" />
                                        <div className="font-serif text-[34px] leading-[1.1] text-white">
                                            আজকের খবর,
                                            <br />
                                            <span className="italic text-white/85">পরিষ্কার ভাবে।</span>
                                        </div>
                                        <div className="mt-6 h-[1px] w-full bg-white/20" />
                                        <div className="mt-5 flex items-center justify-between text-[12.5px] text-white/80">
                                            <span className="inline-flex items-center gap-2.5">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 font-bold">N</span>
                                                NewsPortal · বাংলা + English
                                            </span>
                                            <span className="font-mono text-[10.5px] text-white/60">est. 2024</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── BODY GRID ── */}
                <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-10">
                    <div className="md:grid md:grid-cols-[1fr_180px] md:gap-12">
                        <div className="min-w-0">
                            {/* MISSION */}
                            <section id="mission" className="py-12 md:py-20 border-b border-glass-border scroll-mt-24">
                                <SectionLabel>Mission</SectionLabel>
                                <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[44px] mt-4 leading-[1.08] tracking-[-0.02em] text-white max-w-[820px]">
                                    খবর পড়া আবার <span className="italic text-accent">শান্ত</span> হোক।
                                </h2>
                                <div className="mt-7 grid md:grid-cols-2 gap-8 md:gap-12 max-w-[920px]">
                                    <p className="text-[15.5px] text-secondary leading-[1.7]">
                                        ভালো খবর খুঁজতে দশটা সাইট ঘোরা, ad-এর ভিড়, একই খবর বারবার — এই ক্লান্তিটা দূর
                                        করতেই NewsPortal। একাধিক বিশ্বস্ত source এক feed-এ, duplicate ছাড়া, সম্পূর্ণ article সহ।
                                    </p>
                                    <p className="text-[15.5px] text-secondary leading-[1.7]">
                                        বাংলা ও English — দুই ভাষাই সমান গুরুত্ব পায়। আমরা মনে করি খবর পড়া উচিত
                                        পরিষ্কার, দ্রুত আর বিজ্ঞাপন-মুক্ত — যা track হয় তা শুধু আপনার নিজের জন্য।
                                    </p>
                                </div>
                            </section>

                            {/* NUMBERS */}
                            <section id="numbers" className="py-12 md:py-20 border-b border-glass-border scroll-mt-24">
                                <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                                    <div>
                                        <SectionLabel>By the numbers</SectionLabel>
                                        <h2 className="font-serif text-[26px] md:text-[36px] mt-3 leading-[1.1] tracking-[-0.02em] text-white">
                                            Honest counts, <span className="italic text-accent">live data</span>।
                                        </h2>
                                    </div>
                                    <p className="text-[13px] text-secondary max-w-[280px]">
                                        সব সংখ্যা সরাসরি live API থেকে — hardcode করা নয়।
                                    </p>
                                </div>

                                <div className="rounded-2xl overflow-hidden border border-glass-border relative bg-foreground">
                                    <div
                                        aria-hidden
                                        className="absolute pointer-events-none rounded-full"
                                        style={{ right: -120, bottom: -160, width: 420, height: 420, background: 'radial-gradient(closest-side, rgb(var(--color-accent) / 0.18), transparent 70%)' }}
                                    />
                                    <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-glass-border">
                                        {NUMBERS.map((s) => (
                                            <div key={s.label} className="px-5 py-7 md:py-9 bg-foreground">
                                                <div className="font-serif text-[36px] md:text-[48px] leading-none tracking-tight text-white">
                                                    {s.value}
                                                </div>
                                                <div className="text-[12px] font-medium text-accent mt-3 uppercase tracking-[0.08em]">
                                                    {s.label}
                                                </div>
                                                <div className="text-[11.5px] mt-1 text-secondary">{s.sub}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* PILLARS */}
                            <section id="pillars" className="py-12 md:py-20 border-b border-glass-border scroll-mt-24">
                                <SectionLabel>Four principles</SectionLabel>
                                <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] mt-4 leading-[1.08] tracking-[-0.02em] text-white max-w-[760px]">
                                    আমাদের <span className="italic text-accent">manifesto</span> — চারটা কথা।
                                </h2>
                                <div className="mt-10 md:mt-14">
                                    {PILLARS.map((p, i) => (
                                        <div key={p.title} className="grid md:grid-cols-[72px_1fr_1.4fr] gap-5 md:gap-10 py-8 md:py-10 border-b border-glass-border last:border-b-0">
                                            <div className="font-serif text-[40px] md:text-[52px] leading-none text-secondary/40 tracking-tight">
                                                {String(i + 1).padStart(2, '0')}
                                            </div>
                                            <div>
                                                <div className="inline-flex items-center gap-2.5 text-accent mb-2">
                                                    {p.icon}
                                                    <span className="text-[12px] uppercase tracking-[0.1em] font-medium">Principle</span>
                                                </div>
                                                <h3 className="font-serif text-[21px] md:text-[25px] leading-[1.15] text-white tracking-tight">{p.title}</h3>
                                                <p className="text-[14px] text-secondary mt-2 leading-relaxed">{p.body}</p>
                                            </div>
                                            <div className="md:pt-2">
                                                <p className="text-[14.5px] text-secondary leading-[1.7]">{p.detail}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* TEAM */}
                            <section id="team" className="py-12 md:py-20 border-b border-glass-border scroll-mt-24">
                                <SectionLabel>The crew</SectionLabel>
                                <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] mt-4 leading-[1.08] tracking-[-0.02em] text-white max-w-[820px]">
                                    Three on the ship — <span className="italic text-accent">one human</span>, two co-pilots.
                                </h2>
                                <p className="text-[15px] text-secondary mt-5 leading-relaxed max-w-[680px]">
                                    NewsPortal-এর পেছনে ছোট একটা team — একজন human engineer যিনি product + curation
                                    দেন, আর দুটো AI engineering partner যারা code, design, infra-তে pair করে।
                                    প্রতিটা commit human-reviewed।
                                </p>

                                <div className="grid md:grid-cols-3 gap-5 md:gap-6 mt-10 md:mt-12">
                                    {TEAM.map((m) => (
                                        <article key={m.name} className="glass-morphism border border-glass-border rounded-2xl overflow-hidden flex flex-col">
                                            <div className="h-[180px] relative bg-accent/10 border-b border-glass-border flex items-center justify-center overflow-hidden">
                                                <span className="absolute top-3.5 left-4 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10.5px] font-medium text-white">{m.badge}</span>
                                                <span className="absolute top-3.5 right-4 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10.5px] font-medium text-secondary">{m.since}</span>
                                                <img
                                                    src={m.image}
                                                    alt={`${m.name} avatar`}
                                                    loading="lazy"
                                                    className="h-[110px] w-[110px] rounded-full object-cover border-2 border-background shadow-lg"
                                                />
                                            </div>
                                            <div className="p-5 md:p-6 flex-1 flex flex-col">
                                                <h3 className="font-serif text-[21px] text-white leading-tight tracking-tight">{m.name}</h3>
                                                <div className="text-[12.5px] font-medium mt-1.5 text-accent">{m.role}</div>
                                                {m.kind === 'ai' && (
                                                    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-secondary bg-white/5 px-2 py-1 rounded-md w-fit border border-glass-border">
                                                        <Sparkles className="h-3 w-3" /> AI assistant — every commit human-reviewed
                                                    </div>
                                                )}
                                                <p className="text-[13.5px] text-secondary mt-3 leading-relaxed flex-1">{m.blurb}</p>
                                                {m.link && (
                                                    <a
                                                        href={m.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-5 inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-md bg-white/5 border border-glass-border text-secondary w-fit hover:border-accent/50 hover:text-accent transition-colors"
                                                    >
                                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                                        <span>{m.link.replace(/^https?:\/\//, '')}</span>
                                                    </a>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className="mt-10 md:mt-14 glass-morphism border border-glass-border rounded-2xl p-6 md:p-8 grid md:grid-cols-[180px_1fr] gap-6 md:gap-10">
                                    <div>
                                        <SectionLabel>Methodology</SectionLabel>
                                        <h3 className="font-serif text-[20px] md:text-[22px] mt-2 leading-tight text-white tracking-tight">How human + AI work together</h3>
                                    </div>
                                    <div className="space-y-3 text-[14px] text-secondary leading-[1.7]">
                                        <p>
                                            Engineer প্রতিটা feature define করে — scope, behavior, edge case।
                                            AI partners (Claude + Codex) architecture propose করে, accuracy check করে,
                                            এবং code/refactor suggest করে।
                                        </p>
                                        <p>
                                            কিন্তু <strong className="text-white">final acceptance human-only</strong>। কোনো AI
                                            output সরাসরি ship হয় না — engineer diff line-by-line review করে, তারপর merge।
                                        </p>
                                        <p>
                                            আমরা মনে করি এই hybrid model-ই এখন honest — AI hide করার কোনো reason নেই।
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* STACK */}
                            <section id="stack" className="py-12 md:py-20 border-b border-glass-border scroll-mt-24">
                                <SectionLabel>Built with</SectionLabel>
                                <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] mt-4 leading-[1.08] tracking-[-0.02em] text-white max-w-[760px]">
                                    Tools that <span className="italic text-accent">stay out of the way</span>।
                                </h2>
                                <p className="text-[15px] text-secondary mt-5 leading-relaxed max-w-[640px]">
                                    Frontend single-page React app, edge API on Cloudflare Workers, একটা
                                    scheduled fetch pipeline যা একাধিক source থেকে খবর আনে, dedup করে আর
                                    সম্পূর্ণ body extract করে। Static-fast পাঠকের জন্য, edge-cheap চালাতে।
                                </p>
                                <div className="mt-10 md:mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                                    {STACK.map((group, gi) => (
                                        <div key={group.title} className="glass-morphism border border-glass-border rounded-2xl p-5">
                                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-glass-border">
                                                <span className="text-[11px] uppercase tracking-[0.12em] font-medium text-secondary">{group.title}</span>
                                                <span className="font-serif text-[14px] text-secondary/50">{String(gi + 1).padStart(2, '0')}</span>
                                            </div>
                                            <ul className="space-y-3.5">
                                                {group.items.map((item) => (
                                                    <li key={item.label}>
                                                        <div className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white">
                                                            <span className="text-accent">{item.icon}</span>
                                                            {item.label}
                                                        </div>
                                                        <p className="text-[12.5px] text-secondary leading-snug mt-0.5">{item.desc}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* ROADMAP */}
                            <section id="roadmap" className="py-12 md:py-20 border-b border-glass-border scroll-mt-24">
                                <SectionLabel>What's next</SectionLabel>
                                <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] mt-4 leading-[1.08] tracking-[-0.02em] text-white max-w-[760px]">
                                    পরের দিকে যেদিকে <span className="italic text-accent">যাচ্ছি</span>।
                                </h2>
                                <p className="text-[15px] text-secondary mt-5 leading-relaxed max-w-[620px]">
                                    এটা কোনো deadline-bound list নয় — পরের কয়েক মাসের focus। Order বদলাতে পারে।
                                </p>
                                <div className="mt-10 md:mt-12">
                                    {ROADMAP.map((item, i) => (
                                        <div key={item.title} className="grid md:grid-cols-[56px_140px_1fr] gap-4 md:gap-8 py-6 md:py-7 border-b border-glass-border last:border-b-0 items-start">
                                            <div className="font-mono text-[12.5px] text-secondary/50 pt-1">{String(i + 1).padStart(2, '0')}.</div>
                                            <div className="pt-0.5"><StatusPill status={item.status} /></div>
                                            <div>
                                                <h3 className="font-serif text-[18px] md:text-[20px] leading-[1.2] text-white tracking-tight">{item.title}</h3>
                                                <p className="text-[14px] text-secondary mt-1.5 leading-relaxed max-w-[560px]">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* FAQ */}
                            <section id="faq" className="py-12 md:py-20 border-b border-glass-border scroll-mt-24">
                                <SectionLabel>Common questions</SectionLabel>
                                <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] mt-4 leading-[1.08] tracking-[-0.02em] text-white max-w-[760px]">
                                    আগে অনেকে <span className="italic text-accent">যা জিজ্ঞেস করেছে</span>।
                                </h2>
                                <div className="mt-10 md:mt-12 grid md:grid-cols-2 gap-x-10 gap-y-7">
                                    {FAQ.map((f, i) => (
                                        <div key={f.q}>
                                            <div className="flex items-start gap-3">
                                                <span className="font-mono text-[12px] text-secondary/50 pt-1.5">Q{String(i + 1).padStart(2, '0')}</span>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-serif text-[17px] md:text-[18px] leading-[1.3] text-white tracking-tight">{f.q}</h3>
                                                    <p className="text-[14px] text-secondary mt-2 leading-[1.65]">{f.a}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* CONTACT */}
                            <section id="contact" className="py-12 md:py-20 scroll-mt-24">
                                <SectionLabel>Get in touch</SectionLabel>
                                <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] mt-4 leading-[1.08] tracking-[-0.02em] text-white max-w-[820px]">
                                    Open source, <span className="italic text-accent">open ear</span>।
                                </h2>
                                <p className="text-[15px] text-secondary mt-5 leading-relaxed max-w-[620px]">
                                    Bug, ভুল খবর, নতুন source-এর suggestion, partnership — যেকোনো কিছুর জন্য যোগাযোগ করুন।
                                    Reply সময় লাগতে পারে, কিন্তু পড়া হবেই।
                                </p>
                                <div className="mt-10 md:mt-12 grid md:grid-cols-3 gap-4 md:gap-5">
                                    <a href="mailto:sujoncep@gmail.com" className="glass-morphism border border-glass-border rounded-2xl p-5 hover:border-accent/50 transition-colors group block">
                                        <div className="flex items-center justify-between">
                                            <Mail className="h-5 w-5 text-accent" />
                                            <ArrowUpRight className="h-4 w-4 text-secondary group-hover:text-accent transition-colors" />
                                        </div>
                                        <div className="font-serif text-[18px] mt-4 text-white tracking-tight">Email</div>
                                        <div className="text-[13px] text-secondary mt-1">sujoncep@gmail.com</div>
                                    </a>
                                    <a href="https://github.com/xujoncep" target="_blank" rel="noopener noreferrer" className="glass-morphism border border-glass-border rounded-2xl p-5 hover:border-accent/50 transition-colors group block">
                                        <div className="flex items-center justify-between">
                                            <GithubMark className="h-5 w-5 text-white" />
                                            <ArrowUpRight className="h-4 w-4 text-secondary group-hover:text-accent transition-colors" />
                                        </div>
                                        <div className="font-serif text-[18px] mt-4 text-white tracking-tight">GitHub</div>
                                        <div className="text-[13px] text-secondary mt-1">@xujoncep</div>
                                    </a>
                                    <Link to="/" className="glass-morphism border border-glass-border rounded-2xl p-5 hover:border-accent/50 transition-colors group block">
                                        <div className="flex items-center justify-between">
                                            <BookOpen className="h-5 w-5 text-accent" />
                                            <ArrowUpRight className="h-4 w-4 text-secondary group-hover:text-accent transition-colors" />
                                        </div>
                                        <div className="font-serif text-[18px] mt-4 text-white tracking-tight">Read the news</div>
                                        <div className="text-[13px] text-secondary mt-1">Latest headlines</div>
                                    </Link>
                                </div>

                                <div className="mt-12 md:mt-16 pt-8 border-t border-glass-border">
                                    <SectionLabel>Acknowledgements</SectionLabel>
                                    <p className="text-[13.5px] text-secondary mt-3 leading-relaxed max-w-[820px]">
                                        NewsPortal চলে free + open tools-এ — React, Tailwind CSS, Source Serif & Inter
                                        (open fonts), lucide-react icons, Hono, এবং Cloudflare-এর free tier (Workers,
                                        D1, KV, Pages)। এগুলো ছাড়া এটা free-তে চালানো যেত না। ধন্যবাদ, open-source community।
                                    </p>
                                </div>
                            </section>
                        </div>

                        {/* Sticky page-nav — md+ */}
                        <aside className="hidden md:block">
                            <nav aria-label="On this page" className="sticky top-24 py-12 md:py-20">
                                <div className="text-[10.5px] uppercase tracking-[0.14em] text-secondary font-medium mb-4">On this page</div>
                                <ul className="space-y-2.5">
                                    {PAGE_NAV.map((a) => (
                                        <li key={a.id}>
                                            <a href={`#${a.id}`} className="text-[13px] text-secondary hover:text-accent transition-colors inline-flex items-center gap-2 group">
                                                <span className="h-[1px] w-3 bg-accent/40 group-hover:bg-accent group-hover:w-5 transition-all" />
                                                {a.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </aside>
                    </div>
                </div>

                {/* ── CTA FOOTER ── */}
                <section className="border-t border-glass-border bg-foreground">
                    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-10 py-12 md:py-20">
                        <div
                            className="rounded-2xl border border-glass-border p-8 md:p-14 relative overflow-hidden grid md:grid-cols-[1.3fr_1fr] gap-8 md:gap-12 items-center"
                            style={{ background: 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--color-fg)) 80%)' }}
                        >
                            <div
                                aria-hidden
                                className="absolute rounded-full pointer-events-none"
                                style={{ right: -120, top: -120, width: 360, height: 360, background: 'radial-gradient(closest-side, rgba(255,255,255,0.18), transparent 70%)' }}
                            />
                            <div className="relative">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/80">Ready when you are</div>
                                <h2 className="font-serif text-[28px] sm:text-[36px] md:text-[46px] mt-3 tracking-[-0.02em] leading-[1.08] text-white">
                                    আজকের খবর, <span className="italic text-white/85">এক জায়গায়</span>।
                                </h2>
                                <p className="text-[14.5px] md:text-[15.5px] mt-4 max-w-[480px] leading-[1.65] text-white/80">
                                    বিশ্বস্ত source, সম্পূর্ণ article, কোনো ad নেই। বাংলা আর English — যেভাবে আপনি চান।
                                </p>
                            </div>
                            <div className="relative flex flex-col gap-3">
                                <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-accent font-semibold text-sm h-[52px] hover:bg-white/90 transition-colors">
                                    Browse the news <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link to="/trending" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 text-white font-semibold text-sm h-[52px] hover:bg-white/10 transition-colors">
                                    <Zap className="h-4 w-4" /> See what's trending
                                </Link>
                                <div className="text-[12px] mt-1 text-center text-white/70">Free forever · No tracking · Offline-ready</div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default AboutPage;
