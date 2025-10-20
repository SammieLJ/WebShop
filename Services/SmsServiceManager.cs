using System.Collections.Concurrent;
using WebShop.Models;

namespace WebShop.Services;

/// <summary>
/// Very small SMS manager implementation used for development.
/// It implements basic SendSmsAsync behavior and logs to console.
/// </summary>
public class SmsServiceManager : ISmsServiceManager
{
    // Simple in-memory queue for demo purposes
    private readonly ConcurrentQueue<(string to, string content)> _queue = new();

    public Task<bool> SendSmsAsync(string to, string content)
    {
        _queue.Enqueue((to, content));
        Console.WriteLine($"[SmsServiceManager] Enqueued SMS to {to}: {content}");
        return Task.FromResult(true);
    }
}
