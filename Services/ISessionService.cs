using WebShop.Models;

namespace WebShop.Services;

public interface ISessionService
{
    void SetCurrentUser(User user);
    User? GetCurrentUser();
    void ClearSession();
    bool IsAuthenticated();
    bool HasRole(UserRole role);
    bool IsAdmin();
    bool IsEditor();
    bool IsRegularUser();
}