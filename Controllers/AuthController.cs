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
        if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { error = "Username and password are required" });
        }

        var user = await _authService.AuthenticateAsync(request.Username, request.Password);
        if (user == null)
        {
            return Unauthorized(new { error = "Invalid username or password" });
        }

        _sessionService.SetCurrentUser(user);

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
        var user = _sessionService.GetCurrentUser();
        if (user == null)
        {
            return Unauthorized(new { error = "Not authenticated" });
        }

        return Ok(new
        {
            id = user.Id,
            username = user.Username,
            fullName = user.FullName,
            role = user.Role.ToString(),
            roleLevel = (int)user.Role
        });
    }
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}