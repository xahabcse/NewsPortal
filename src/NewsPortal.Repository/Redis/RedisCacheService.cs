using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NewsPortal.Core.Interfaces;
using StackExchange.Redis;

namespace NewsPortal.Repository.Redis;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly string _instanceName;

    // Cache stampede protection locks with automatic cleanup
    private static readonly ConcurrentDictionary<string, (SemaphoreSlim Semaphore, DateTime LastUsed)> _locks = new();
    private static readonly Timer _lockCleanupTimer;
    private static readonly TimeSpan LockExpirationTime = TimeSpan.FromMinutes(5);

    static RedisCacheService()
    {
        // Cleanup expired locks every 5 minutes to prevent memory leak
        _lockCleanupTimer = new Timer(CleanupExpiredLocks, null, TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    public RedisCacheService(IDistributedCache cache, IConfiguration configuration, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        _instanceName = "NewsPortal:";

        // Try to get Redis connection for pattern-based operations
        try
        {
            var connectionString = configuration.GetConnectionString("Redis");
            if (!string.IsNullOrEmpty(connectionString))
            {
                _redis = ConnectionMultiplexer.Connect(connectionString);
                _logger.LogInformation("Redis connection established for pattern-based operations");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis direct connection not available - pattern operations will be disabled");
            _redis = null;
        }
    }

    private static void CleanupExpiredLocks(object? state)
    {
        var now = DateTime.UtcNow;
        var keysToRemove = new List<string>();

        foreach (var kvp in _locks)
        {
            if (now - kvp.Value.LastUsed > LockExpirationTime)
            {
                keysToRemove.Add(kvp.Key);
            }
        }

        foreach (var key in keysToRemove)
        {
            if (_locks.TryRemove(key, out var lockInfo))
            {
                lockInfo.Semaphore.Dispose();
            }
        }
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        var data = await _cache.GetStringAsync(key);
        if (string.IsNullOrEmpty(data))
            return default;

        return JsonSerializer.Deserialize<T>(data, _jsonOptions);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        var options = new DistributedCacheEntryOptions();
        if (expiration.HasValue)
        {
            options.AbsoluteExpirationRelativeToNow = expiration;
        }
        else
        {
            options.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15);
        }

        var data = JsonSerializer.Serialize(value, _jsonOptions);
        await _cache.SetStringAsync(key, data, options);
    }

    public async Task RemoveAsync(string key)
    {
        await _cache.RemoveAsync(key);
    }

    public async Task RemoveByPatternAsync(string pattern)
    {
        if (_redis == null || !_redis.IsConnected)
        {
            _logger.LogWarning("Redis connection not available for pattern-based removal. Pattern: {Pattern}", pattern);
            return;
        }

        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var fullPattern = _instanceName + pattern;

            _logger.LogInformation("Scanning Redis for pattern: {Pattern}", fullPattern);

            var keys = server.Keys(pattern: fullPattern, pageSize: 1000).ToArray();

            if (keys.Length == 0)
            {
                _logger.LogInformation("No keys found matching pattern: {Pattern}", fullPattern);
                return;
            }

            var db = _redis.GetDatabase();
            var deletedCount = 0;

            // Delete in batches for better performance
            foreach (var batch in keys.Chunk(100))
            {
                var tasks = batch.Select(key => db.KeyDeleteAsync(key));
                await Task.WhenAll(tasks);
                deletedCount += batch.Length;
            }

            _logger.LogInformation("Removed {Count} keys matching pattern: {Pattern}", deletedCount, pattern);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove keys by pattern: {Pattern}", pattern);
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        var data = await _cache.GetAsync(key);
        return data != null;
    }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null)
    {
        // First, try to get from cache
        var cached = await GetAsync<T>(key);
        if (cached != null)
            return cached;

        // Cache stampede protection: use per-key semaphore to ensure only one thread executes factory
        var lockInfo = _locks.GetOrAdd(key, _ => (new SemaphoreSlim(1, 1), DateTime.UtcNow));

        // Update last used time
        _locks[key] = (lockInfo.Semaphore, DateTime.UtcNow);

        await lockInfo.Semaphore.WaitAsync();
        try
        {
            // Double-check: another thread might have populated the cache while we were waiting
            cached = await GetAsync<T>(key);
            if (cached != null)
                return cached;

            // Execute the factory function (only one thread will reach here)
            var value = await factory();
            await SetAsync(key, value, expiration);
            return value;
        }
        finally
        {
            lockInfo.Semaphore.Release();

            // Update last used time on release
            _locks[key] = (lockInfo.Semaphore, DateTime.UtcNow);
        }
    }
}
