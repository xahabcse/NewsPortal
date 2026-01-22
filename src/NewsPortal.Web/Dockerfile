# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution file and project files
COPY ["NewsPortal.sln", "./"]
COPY ["src/NewsPortal.Web/NewsPortal.Web.csproj", "src/NewsPortal.Web/"]
COPY ["src/NewsPortal.Application/NewsPortal.Application.csproj", "src/NewsPortal.Application/"]
COPY ["src/NewsPortal.Infrastructure/NewsPortal.Infrastructure.csproj", "src/NewsPortal.Infrastructure/"]
COPY ["src/NewsPortal.Core/NewsPortal.Core.csproj", "src/NewsPortal.Core/"]
COPY ["src/NewsPortal.BackgroundJobs/NewsPortal.BackgroundJobs.csproj", "src/NewsPortal.BackgroundJobs/"]

# Restore dependencies
RUN dotnet restore "src/NewsPortal.Web/NewsPortal.Web.csproj"

# Copy all source code
COPY src/ src/

# Build the application
WORKDIR "/src/src/NewsPortal.Web"
RUN dotnet build "NewsPortal.Web.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "NewsPortal.Web.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install timezone data
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

# Create logs directory
RUN mkdir -p /app/logs && chmod 755 /app/logs

# Copy published application
COPY --from=publish /app/publish .

# Expose port
EXPOSE 8080

# Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

ENTRYPOINT ["dotnet", "NewsPortal.Web.dll"]
