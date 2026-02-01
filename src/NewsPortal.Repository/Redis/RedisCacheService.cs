using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using NewsPortal.Core.Interfaces;

namespace NewsPortal.Repository.Redis;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly JsonSerializerOptions _jsonOptions;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    public RedisCacheService(IDistributedCache cache)
    {
        _cache = cache;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
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

    public Task RemoveByPatternAsync(string pattern)
    {
        // Note: Pattern-based removal requires Redis server commands
        // For simple cases, you may need to track keys separately
        // This is a simplified implementation
        return Task.CompletedTask;
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
        var semaphore = _locks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));

        await semaphore.WaitAsync();
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
            semaphore.Release();

            // Clean up the semaphore if no one is waiting
            if (semaphore.CurrentCount == 1 && _locks.TryRemove(key, out _))
            {
                semaphore.Dispose();
            }
        }
    }
}
