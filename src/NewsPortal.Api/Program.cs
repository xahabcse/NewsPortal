using Microsoft.EntityFrameworkCore;
using NewsPortal.Application;
using NewsPortal.Infrastructure;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "NewsPortal.Api")
    .WriteTo.Console()
    .WriteTo.Seq(builder.Configuration.GetConnectionString("Seq") ?? "http://seq:5341")
    .CreateLogger();

builder.Host.UseSerilog();

// Add services
builder.Services.AddControllers();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Auto-apply migrations
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<NewsPortal.Infrastructure.Data.NewsPortalDbContext>();
        Log.Information("Applying migrations...");
        context.Database.Migrate();
        Log.Information("Migrations applied successfully.");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "An error occurred while applying migrations.");
    }
}

// Configure the HTTP request pipeline.
app.UseDeveloperExceptionPage(); 

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        
        Log.Error(exceptionHandlerPathFeature?.Error, "Unhandled exception occurred");

        await context.Response.WriteAsJsonAsync(new
        {
            error = exceptionHandlerPathFeature?.Error.Message,
            details = exceptionHandlerPathFeature?.Error.StackTrace
        });
    });
});

app.UseCors("AllowAll");

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

app.Run();
