# NewsPortal API - Swagger Documentation

## Overview

Swagger/OpenAPI documentation has been successfully integrated into the NewsPortal API project.

## What Was Added

### 1. NuGet Package
- **Swashbuckle.AspNetCore** (v6.6.2) - Provides Swagger/OpenAPI generation and UI

### 2. Configuration Files Updated

#### NewsPortal.Api.csproj
- Added Swashbuckle.AspNetCore package reference
- Enabled XML documentation generation
- Suppressed warning 1591 (missing XML comments)

#### Program.cs
- Configured Swagger services with OpenAPI information
- Enabled Swagger middleware for all environments
- Configured Swagger UI to serve at the application root (`/`)
- Integrated XML comments for enhanced documentation

## Accessing Swagger UI

Once the API is running, access the Swagger documentation at:

**Root URL**: `http://localhost:5016/` or `https://localhost:7106/`

The Swagger UI is configured to display at the application root, providing immediate access to:
- All API endpoints
- Request/Response schemas
- Interactive API testing
- XML documentation comments

## Building the API

The API builds successfully:

```bash
cd src/NewsPortal.Api
dotnet build
```

**Build Status**: ✅ Success (with pre-existing ImageSharp vulnerability warnings in dependencies)

## Running the API Independently

### Prerequisites

The NewsPortal API depends on the following services:
1. **PostgreSQL** - Main database (default port: 5432)
2. **MongoDB** - Image storage with GridFS (default port: 27017)
3. **Redis** - Caching layer (default port: 6379)
4. **Seq** - Optional logging service (default port: 5341)

### Option 1: Using Docker Compose (Infrastructure Only)

Start only the infrastructure services:

```bash
# From the project root
docker-compose up -d postgres mongodb redis seq
```

Then run the API locally:

```bash
cd src/NewsPortal.Api
dotnet run
```

The API will connect to:
- PostgreSQL: `localhost:5432`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- Seq: `localhost:5341`

### Option 2: With Environment Variables

Set connection strings via environment variables:

**Windows (PowerShell):**
```powershell
$env:ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=newsportal;Username=newsadmin;Password=YourPassword"
$env:ConnectionStrings__MongoDB="mongodb://mongouser:MongoPassword@localhost:27017/newsportal?authSource=admin"
$env:ConnectionStrings__Redis="localhost:6379,abortConnect=false"
$env:ConnectionStrings__Seq="http://localhost:5341"
dotnet run
```

**Linux/Mac (Bash):**
```bash
export ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=newsportal;Username=newsadmin;Password=YourPassword"
export ConnectionStrings__MongoDB="mongodb://mongouser:MongoPassword@localhost:27017/newsportal?authSource=admin"
export ConnectionStrings__Redis="localhost:6379,abortConnect=false"
export ConnectionStrings__Seq="http://localhost:5341"
dotnet run
```

### Option 3: Update appsettings.Development.json

Create or update `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Port=5432;Database=newsportal;Username=newsadmin;Password=YourPassword",
    "MongoDB": "mongodb://mongouser:MongoPassword@localhost:27017/newsportal?authSource=admin",
    "Redis": "localhost:6379,abortConnect=false",
    "Seq": "http://localhost:5341"
  }
}
```

## Swagger Configuration Details

### API Information
- **Title**: NewsPortal API
- **Version**: v1
- **Description**: A comprehensive news aggregation and management API
- **Contact**: NewsPortal Team (contact@newsportal.com)

### Features
- **Interactive API Explorer**: Test endpoints directly from the browser
- **Schema Definitions**: View request/response models
- **XML Comments**: Enhanced endpoint descriptions (when added to controllers)
- **Try it Out**: Execute API calls with custom parameters

## Available Endpoints

The API exposes the following controller groups:
- News Articles Management
- News Sources Management
- Categories Management
- Search Functionality
- Health Check

## Adding XML Documentation to Controllers

To enhance Swagger documentation, add XML comments to controller actions:

```csharp
/// <summary>
/// Retrieves the latest news articles with pagination
/// </summary>
/// <param name="page">Page number (1-based indexing)</param>
/// <param name="pageSize">Number of items per page</param>
/// <returns>Paginated list of news articles</returns>
/// <response code="200">Returns the list of articles</response>
/// <response code="400">Invalid pagination parameters</response>
[HttpGet("latest")]
[ProducesResponseType(typeof(IEnumerable<NewsArticleDto>), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
public async Task<IActionResult> GetLatestNews(int page = 1, int pageSize = 10)
{
    // Implementation
}
```

## Next Steps

1. **Add XML Comments**: Enhance API documentation by adding XML comments to all controller actions
2. **API Versioning**: Consider implementing API versioning for future-proofing
3. **Authentication**: Add Swagger authentication configuration (JWT bearer tokens)
4. **Security**: Configure Swagger to document security requirements
5. **Examples**: Add request/response examples using Swashbuckle attributes

## Troubleshooting

### Issue: Swagger UI not loading
- Verify the API is running on the correct port
- Check browser console for errors
- Ensure Swagger middleware is registered before `app.UseCors()`

### Issue: XML comments not showing
- Verify `GenerateDocumentationFile` is set to `true` in .csproj
- Ensure XML file exists in bin/Debug/net8.0/
- Check that XML comments use the correct format (`///`)

### Issue: Database connection errors
- Verify all required services (PostgreSQL, MongoDB, Redis) are running
- Check connection strings in configuration
- Review logs in `logs/api-{date}.log`

## Security Notes

**Important**: The current Swagger configuration is available in all environments (Development, Staging, Production). For production deployments:

1. Consider restricting Swagger access:
```csharp
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => { ... });
}
```

2. Or add authentication to Swagger UI
3. Or serve Swagger on a different port/path with restricted access

## Build Verification

✅ Project builds successfully
✅ XML documentation generates
✅ Swagger packages installed
✅ Swagger middleware configured
✅ No compilation errors

**Last Verified**: 2026-01-26
