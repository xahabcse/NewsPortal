using Microsoft.EntityFrameworkCore;
using NewsPortal.Api.DataSeed;
using NewsPortal.Repository;
using NewsPortal.Scheduler;
using NewsPortal.Service;
using Serilog;

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

// Add Swagger/OpenAPI
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

    // Include XML comments
    var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// Add automatic news fetching background service
builder.Services.AddHostedService<NewsPortal.API.BackgroundServices.NewsFetchBackgroundService>();

// Enable CORS with environment-based configuration
var corsOrigins = builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:5000";
builder.Services.AddCors(options =>
{
    options.AddPolicy("NewsPortalPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Auto-apply migrations and seed data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<NewsPortal.Repository.Data.NewsPortalDbContext>();
        Log.Information("Applying migrations...");
        context.Database.Migrate();
        Log.Information("Migrations applied successfully.");

        Log.Information("Seeding database...");
        DbInitializer.Initialize(context);
        Log.Information("Database seeding completed.");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while preparing the database.");
    }
}



// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(exceptionHandlerApp =>
    {
        exceptionHandlerApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();

            Log.Error(exceptionHandlerPathFeature?.Error, "Unhandled exception occurred");

            // Don't expose internal details in production
            await context.Response.WriteAsJsonAsync(new
            {
                error = "An error occurred while processing your request.",
                timestamp = DateTime.UtcNow
            });
        });
    });
}

// Enable Swagger UI (available in all environments for API documentation)
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "NewsPortal API v1");
    options.RoutePrefix = string.Empty; // Serve Swagger UI at the app's root (http://localhost:port/)
    options.DocumentTitle = "NewsPortal API Documentation";
});

// Add request logging
app.UseSerilogRequestLogging();

app.UseCors("NewsPortalPolicy");

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

app.Run();
