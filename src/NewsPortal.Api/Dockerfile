FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["NewsPortal.sln", "./"]
COPY ["src/NewsPortal.Api/NewsPortal.Api.csproj", "src/NewsPortal.Api/"]
COPY ["src/NewsPortal.Application/NewsPortal.Application.csproj", "src/NewsPortal.Application/"]
COPY ["src/NewsPortal.Infrastructure/NewsPortal.Infrastructure.csproj", "src/NewsPortal.Infrastructure/"]
COPY ["src/NewsPortal.Core/NewsPortal.Core.csproj", "src/NewsPortal.Core/"]
RUN dotnet restore "src/NewsPortal.Api/NewsPortal.Api.csproj"
COPY src/ src/
WORKDIR "/src/src/NewsPortal.Api"
RUN dotnet build "NewsPortal.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "NewsPortal.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "NewsPortal.Api.dll"]
