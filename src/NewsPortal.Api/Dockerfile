FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["NewsPortal.sln", "./"]
COPY ["src/NewsPortal.API/NewsPortal.API.csproj", "src/NewsPortal.API/"]
COPY ["src/NewsPortal.Service/NewsPortal.Service.csproj", "src/NewsPortal.Service/"]
COPY ["src/NewsPortal.Repository/NewsPortal.Repository.csproj", "src/NewsPortal.Repository/"]
COPY ["src/NewsPortal.Core/NewsPortal.Core.csproj", "src/NewsPortal.Core/"]
COPY ["src/NewsPortal.Scheduler/NewsPortal.Scheduler.csproj", "src/NewsPortal.Scheduler/"]
RUN dotnet restore "src/NewsPortal.API/NewsPortal.API.csproj"
COPY src/ src/
WORKDIR "/src/src/NewsPortal.API"
RUN dotnet build "NewsPortal.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "NewsPortal.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "NewsPortal.API.dll"]
