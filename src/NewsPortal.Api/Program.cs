using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NewsPortal.Api.Middleware;
using NewsPortal.Repository;
using NewsPortal.Repository.Data;
using NewsPortal.Scheduler;
using NewsPortal.Service;
using Serilog;
using System.Text;
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

// Add Serilog
var seqUrl = builder.Configuration.GetConnectionString("Seq");
seqUrl = string.IsNullOrWhiteSpace(seqUrl) ? "http://localhost:5341" : seqUrl;

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "NewsPortal.API")
    .WriteTo.Console()
    .WriteTo.File("logs/api-.log", rollingInterval: RollingInterval.Day)
    .WriteTo.Seq(seqUrl)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddControllers();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddBackgroundJobs();
builder.Services.AddSignalR();
builder.Services.AddScoped<NewsPortal.Api.Services.ISignalRNotificationService, NewsPortal.Api.Services.SignalRNotificationService>();

// Add Hangfire client for queueing manual fetch jobs.
// Worker execution is handled by NewsPortal.McpServer.
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(builder.Configuration.GetConnectionString("PostgreSQL"))));

// Add API Versioning
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new Asp.Versioning.ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = Asp.Versioning.ApiVersionReader.Combine(
        new Asp.Versioning.QueryStringApiVersionReader("api-version"),
        new Asp.Versioning.HeaderApiVersionReader("X-Api-Version"),
        new Asp.Versioning.MediaTypeApiVersionReader("ver")
    );
}).AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

// Reject obvious placeholder values from committed appsettings files.
if (secretKey.StartsWith("USE_ENV_VARIABLE", StringComparison.OrdinalIgnoreCase) || secretKey.Length < 32)
{
    throw new InvalidOperationException(
        "JwtSettings:SecretKey is missing, placeholder, or too short. " +
        "Set it via JwtSettings__SecretKey env var (32+ chars).");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Add Swagger/OpenAPI with JWT support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Version = "v1",
        Title = "NewsPortal API",
        Description = "A comprehensive news aggregation and management API",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "NewsPortal Team",
            Email = "contact@newsportal.com"
        }
    });

    // Add JWT Authentication to Swagger
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by a space and your JWT token"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Include XML comments
    var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// DISABLED: Background service removed to prevent dual scheduling with Hangfire in McpServer
// News fetching now handled exclusively by Hangfire recurring job in McpServer (every 15 min)
// builder.Services.AddHostedService<NewsPortal.API.BackgroundServices.NewsFetchBackgroundService>();

// Rate limiting — 10 login attempts per minute per IP
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("LoginPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            }
        )
    );

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"message\":\"Too many login attempts. Please wait a moment and try again.\"}",
            token
        );
    };
});

// CORS: configured origins always allowed. localhost + private LAN IPs are
// allowed only outside Production (override with ALLOW_LAN_CORS=true if needed).
var corsOrigins = builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:5000";
var allowLanCors = !builder.Environment.IsProduction()
    || string.Equals(Environment.GetEnvironmentVariable("ALLOW_LAN_CORS"), "true", StringComparison.OrdinalIgnoreCase);

builder.Services.AddCors(options =>
{
    options.AddPolicy("NewsPortalPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries))
              .SetIsOriginAllowed(origin =>
              {
                  if (!allowLanCors) return false;

                  if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                  {
                      var host = uri.Host;
                      if (host is "localhost" or "127.0.0.1") return true;
                      if (System.Net.IPAddress.TryParse(host, out var ip))
                      {
                          var bytes = ip.GetAddressBytes();
                          if (bytes.Length == 4)
                          {
                              return bytes[0] == 10 ||
                                     (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
                                     (bytes[0] == 192 && bytes[1] == 168);
                          }
                      }
                  }
                  return false;
              })
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
              .WithHeaders("Content-Type", "Authorization", "Accept", "X-Requested-With")
              .WithExposedHeaders("X-Pagination")
              .AllowCredentials();
    });
});

var app = builder.Build();

// Auto-apply migrations + seed data.
// In a multi-instance deploy set RUN_DB_MIGRATIONS=false on all but one pod
// (or run migrations from a dedicated init container / CI step instead).
var runMigrations = !string.Equals(
    Environment.GetEnvironmentVariable("RUN_DB_MIGRATIONS"), "false", StringComparison.OrdinalIgnoreCase);

if (runMigrations)
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<NewsPortal.Repository.Data.NewsPortalDbContext>();
        Log.Information("Applying migrations...");
        context.Database.Migrate();
        Log.Information("Migrations applied successfully.");

        Log.Information("Seeding database...");
        await SeedData.SeedAsync(context, app.Configuration, app.Environment.IsProduction());
        Log.Information("Database seeding completed.");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while preparing the database.");
    }
}
else
{
    Log.Information("RUN_DB_MIGRATIONS=false — skipping migrations/seeding.");
}



// Configure the HTTP request pipeline.
// Add security headers middleware
app.UseMiddleware<SecurityHeadersMiddleware>();

// Add global exception handling middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    // Add HTTPS redirection and HSTS for production
    app.UseHttpsRedirection();
    app.UseHsts();
}

// Swagger UI exposed only outside Production to avoid leaking the API surface.
// Set ENABLE_SWAGGER=true to force-enable in Production (e.g. behind a VPN).
var enableSwagger = !app.Environment.IsProduction()
    || string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase);

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "NewsPortal API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "NewsPortal API Documentation";
    });
}

// Add request logging
app.UseSerilogRequestLogging();

// Add Prometheus metrics
app.UseHttpMetrics();

app.UseRateLimiter();
app.UseCors("NewsPortalPolicy");

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<NewsPortal.Api.Hubs.NewsHub>("/newsHub");

app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));
app.MapMetrics("/metrics");

app.Run();
