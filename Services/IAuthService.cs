using WebShop.Models;

namespace WebShop.Services;

public interface IAuthService
{
    Task<User?> AuthenticateAsync(string username, string password);
    Task<User> CreateUserAsync(string username, string password, string fullName, string email, UserRole role);
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
    Task<User?> GetUserByIdAsync(int id);
    Task<User?> GetUserByUsernameAsync(string username);
    Task<List<User>> GetAllUsersAsync();
    Task<User> UpdateUserAsync(User user);
    Task DeleteUserAsync(int id);
}