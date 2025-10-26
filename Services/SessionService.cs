using WebShop.Models;

namespace WebShop.Services;

public class SessionService : ISessionService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SessionService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public void SetCurrentUser(User user)
    {
        var session = _httpContextAccessor.HttpContext?.Session;
        if (session != null)
        {
            session.SetInt32("UserId", user.Id);
            session.SetString("Username", user.Username);
            session.SetString("FullName", user.FullName);
            session.SetString("Email", user.Email);
            session.SetInt32("UserRole", (int)user.Role);
        }
    }

    public User? GetCurrentUser()
    {
        var session = _httpContextAccessor.HttpContext?.Session;
        if (session == null) return null;

        var userId = session.GetInt32("UserId");
        var username = session.GetString("Username");
        var fullName = session.GetString("FullName");
        var email = session.GetString("Email");
        var userRole = session.GetInt32("UserRole");

        if (userId.HasValue && !string.IsNullOrEmpty(username) && 
            !string.IsNullOrEmpty(fullName) && !string.IsNullOrEmpty(email) && userRole.HasValue)
        {
            return new User
            {
                Id = userId.Value,
                Username = username,
                FullName = fullName,
                Email = email,
                Role = (UserRole)userRole.Value,
                PasswordHash = "" // Never store in session
            };
        }

        return null;
    }

    public void ClearSession()
    {
        _httpContextAccessor.HttpContext?.Session.Clear();
    }

    public bool IsAuthenticated()
    {
        return GetCurrentUser() != null;
    }

    public bool HasRole(UserRole role)
    {
        var user = GetCurrentUser();
        return user != null && user.Role >= role;
    }

    public bool IsAdmin()
    {
        return HasRole(UserRole.Admin);
    }

    public bool IsEditor()
    {
        return HasRole(UserRole.Editor);
    }

    public bool IsRegularUser()
    {
        return IsAuthenticated();
    }
}