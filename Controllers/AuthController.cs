using Microsoft.AspNetCore.Mvc;
using WebShop.Models;
using WebShop.Services;

namespace WebShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ISessionService _sessionService;

    public AuthController(IAuthService authService, ISessionService sessionService)
    {
        _authService = authService;
        _sessionService = sessionService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        Console.WriteLine($"Login attempt for username: {request.Username}");
        
        if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { error = "Username and password are required" });
        }

        var user = await _authService.AuthenticateAsync(request.Username, request.Password);
        if (user == null)
        {
            Console.WriteLine("Authentication failed - invalid credentials");
            return Unauthorized(new { error = "Invalid username or password" });
        }

        Console.WriteLine($"Authentication successful for user: {user.Username} (ID: {user.Id})");
        _sessionService.SetCurrentUser(user);
        Console.WriteLine("User set in session");

        return Ok(new
        {
            id = user.Id,
            username = user.Username,
            fullName = user.FullName,
            email = user.Email,
            role = user.Role.ToString(),
            roleLevel = (int)user.Role
        });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        _sessionService.ClearSession();
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpGet("current")]
    public IActionResult GetCurrentUser()
    {
        Console.WriteLine("GetCurrentUser called");
        var user = _sessionService.GetCurrentUser();
        Console.WriteLine($"Session user: {(user != null ? $"ID={user.Id}, Username={user.Username}" : "null")}");
        
        if (user == null)
        {
            Console.WriteLine("User is null, returning Unauthorized");
            return Unauthorized(new { error = "Not authenticated" });
        }

        var response = new
        {
            id = user.Id,
            username = user.Username,
            fullName = user.FullName,
            email = user.Email,
            role = user.Role.ToString(),
            roleLevel = (int)user.Role
        };
        
        Console.WriteLine($"Returning user data: {response}");
        return Ok(response);
    }
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}