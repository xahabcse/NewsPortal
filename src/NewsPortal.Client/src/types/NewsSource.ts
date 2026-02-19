export interface NewsSource {
    id: number;
    name: string;
    slug: string;
    baseUrl: string;
    logoUrl?: string;
    fetchMethod: number; // 1: Rss, 2: Api, 3: Scrape
    rssFeedUrl?: string;
    apiEndpoint?: string;
    apiKey?: string;
    fetchIntervalMinutes: number;
    isActive: boolean;
    lastFetchedAt?: string;
    healthStatus?: number; // 0: Active, 1: Degraded, 2: Paused, 3: Disabled
    consecutiveFailures?: number;
    lastSuccessAt?: string;
    lastFailureAt?: string;
    lastErrorCode?: string;
    nextRetryAt?: string;
    requestTimeoutSeconds?: number;
    maxRetryAttempts?: number;
    circuitBreakerThreshold?: number;
    articleCount?: number;
}

export interface CreateNewsSourceDto {
    name: string;
    baseUrl: string;
    logoUrl?: string;
    fetchMethod: number;
    rssFeedUrl?: string;
    apiEndpoint?: string;
    apiKey?: string;
    fetchIntervalMinutes: number;
}

export interface NewsSourceTestIssue {
    code: string;
    message: string;
    method?: string;
}

export interface NewsSourceTestResult {
    isSuccess: boolean;
    message: string;
    primaryMethod: number;
    successfulMethod?: number;
    usedFallback: boolean;
    articlesFetched: number;
    validArticles: number;
    invalidArticles: number;
    sampleTitles: string[];
    issues: NewsSourceTestIssue[];
    durationMs: number;
}

export interface BulkNewsSourceActionRequest {
    sourceIds: number[];
    action: 'pause' | 'resume' | 'fetch';
}

export interface BulkNewsSourceActionResult {
    action: string;
    totalRequested: number;
    affectedCount: number;
    queuedJobs: number;
    skippedSourceIds: number[];
    message: string;
}

export interface FetchJobResponse {
    message: string;
    sourceId: number;
    jobId: string;
    status: string;
    hangfireJobId?: string;
}

export interface FetchJobStatusResponse {
    jobId: string;
    sourceId: number;
    sourceName: string;
    status: string;
    triggerType: string;
    attempts: number;
    startedAt?: string;
    finishedAt?: string;
    articlesFetched: number;
    newArticles: number;
    updatedArticles: number;
    errorCode?: string;
    errorSummary?: string;
}
