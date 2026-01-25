# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution file and project files
COPY ["NewsPortal.sln", "./"]
COPY ["src/NewsPortal.McpServer/NewsPortal.McpServer.csproj", "src/NewsPortal.McpServer/"]
COPY ["src/NewsPortal.Service/NewsPortal.Service.csproj", "src/NewsPortal.Service/"]
COPY ["src/NewsPortal.Repository/NewsPortal.Repository.csproj", "src/NewsPortal.Repository/"]
COPY ["src/NewsPortal.Core/NewsPortal.Core.csproj", "src/NewsPortal.Core/"]
COPY ["src/NewsPortal.Scheduler/NewsPortal.Scheduler.csproj", "src/NewsPortal.Scheduler/"]

# Restore dependencies
RUN dotnet restore "src/NewsPortal.McpServer/NewsPortal.McpServer.csproj"

# Copy all source code
COPY src/ src/

# Build the application
WORKDIR "/src/src/NewsPortal.McpServer"
RUN dotnet build "NewsPortal.McpServer.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "NewsPortal.McpServer.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final stage
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final
WORKDIR /app

# Install timezone data
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*

# Create logs directory
RUN mkdir -p /app/logs && chmod 755 /app/logs

# Copy published application
COPY --from=publish /app/publish .

# Run as non-root user
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

ENTRYPOINT ["dotnet", "NewsPortal.McpServer.dll"]
