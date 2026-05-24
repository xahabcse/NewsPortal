export type Env = {
  Bindings: {
    DB: D1Database;
    CACHE_KV: KVNamespace;

    // Secrets (set via `wrangler secret put`)
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GEMINI_API_KEY: string;
    CLOUDINARY_API_SECRET: string;

    // Non-secret vars (declared in wrangler.toml [vars])
    ADMIN_EMAIL: string;
    CORS_ORIGINS: string;
    PUBLIC_BASE_URL: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
  };

  Variables: {
    userId?: number;
    role?: string;
  };
};
