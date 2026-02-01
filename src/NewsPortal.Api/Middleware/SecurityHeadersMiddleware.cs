namespace NewsPortal.Api.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // X-Content-Type-Options: Prevents MIME-sniffing attacks
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";

        // X-Frame-Options: Prevents clickjacking attacks
        context.Response.Headers["X-Frame-Options"] = "DENY";

        // X-XSS-Protection: Enables browser's XSS filter (legacy support)
        context.Response.Headers["X-XSS-Protection"] = "1; mode=block";

        // Referrer-Policy: Controls how much referrer information is shared
        context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

        // Permissions-Policy: Controls which browser features can be used
        context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()";

        // Content-Security-Policy: Prevents XSS and other code injection attacks
        // For API, we use a restrictive policy since we don't serve HTML
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'none'; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self'";

        // Strict-Transport-Security (HSTS): Forces HTTPS connections
        // Only add HSTS in production to avoid development issues
        if (!context.Request.Host.Host.Contains("localhost"))
        {
            context.Response.Headers["Strict-Transport-Security"] =
                "max-age=31536000; includeSubDomains; preload";
        }

        await _next(context);
    }
}
