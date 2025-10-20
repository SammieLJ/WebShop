namespace WebShop.Services;

/// <summary>
/// Interface for SMS service providers
/// </summary>
public interface ISmsService
{
    Task<bool> SendSmsAsync(string to, string content);
    string ServiceName { get; }
}

/// <summary>
/// Manager interface for handling multiple SMS services with rate limiting
/// </summary>
public interface ISmsServiceManager
{
    Task<bool> SendSmsAsync(string to, string content);
}