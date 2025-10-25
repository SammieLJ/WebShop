using Microsoft.AspNetCore.Mvc;
using WebShop.Models;
using WebShop.Services;

namespace WebShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ISessionService _sessionService;

    public UsersController(IAuthService authService, ISessionService sessionService)
    {
        _authService = authService;
        _sessionService = sessionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        if (!_sessionService.IsAdmin())
        {
            return Forbid("Admin access required");
        }

        var users = await _authService.GetAllUsersAsync();
        var userDtos = users.Select(u => new
        {
            id = u.Id,
            username = u.Username,
            fullName = u.FullName,
            email = u.Email,
            role = u.Role.ToString(),
            roleLevel = (int)u.Role,
            isActive = u.IsActive,
            dateCreated = u.DateCreated,
            lastLogin = u.LastLogin
        });

        return Ok(userDtos);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (!_sessionService.IsAdmin())
        {
            return Forbid("Admin access required");
        }

        if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password) ||
            string.IsNullOrEmpty(request.FullName) || string.IsNullOrEmpty(request.Email))
        {
            return BadRequest(new { error = "All fields are required" });
        }

        if (request.Password.Length < 6)
        {
            return BadRequest(new { error = "Password must be at least 6 characters long" });
        }

        try
        {
            var user = await _authService.CreateUserAsync(
                request.Username,
                request.Password,
                request.FullName,
                request.Email,
                request.Role
            );

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role.ToString(),
                roleLevel = (int)user.Role,
                isActive = user.IsActive,
                dateCreated = user.DateCreated
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        if (!_sessionService.IsAdmin())
        {
            return Forbid("Admin access required");
        }

        var user = await _authService.GetUserByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        // Update user properties
        if (!string.IsNullOrEmpty(request.FullName))
            user.FullName = request.FullName;

        if (!string.IsNullOrEmpty(request.Email))
            user.Email = request.Email;

        if (request.Role.HasValue)
            user.Role = request.Role.Value;

        if (request.IsActive.HasValue)
            user.IsActive = request.IsActive.Value;

        // Update password if provided
        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            if (request.NewPassword.Length < 6)
            {
                return BadRequest(new { error = "Password must be at least 6 characters long" });
            }
            user.PasswordHash = _authService.HashPassword(request.NewPassword);
        }

        try
        {
            await _authService.UpdateUserAsync(user);

            return Ok(new
            {
                id = user.Id,
                username = user.Username,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role.ToString(),
                roleLevel = (int)user.Role,
                isActive = user.IsActive,
                dateCreated = user.DateCreated
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        if (!_sessionService.IsAdmin())
        {
            return Forbid("Admin access required");
        }

        var currentUser = _sessionService.GetCurrentUser();
        if (currentUser?.Id == id)
        {
            return BadRequest(new { error = "Cannot delete your own account" });
        }

        var user = await _authService.GetUserByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        await _authService.DeleteUserAsync(id);
        return Ok(new { message = "User deleted successfully" });
    }
}

public class CreateUserRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public UserRole Role { get; set; } = UserRole.RegularUser;
}

public class UpdateUserRequest
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public UserRole? Role { get; set; }
    public bool? IsActive { get; set; }
    public string? NewPassword { get; set; }
}