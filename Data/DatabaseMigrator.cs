using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using WebShop.Models;

namespace WebShop.Data;

public class DatabaseMigrator
{
    private readonly AppDbContext _context;
    private readonly ILogger<DatabaseMigrator> _logger;
    private readonly IWebHostEnvironment _environment;

    public DatabaseMigrator(AppDbContext context, ILogger<DatabaseMigrator> logger, IWebHostEnvironment environment)
    {
        _context = context;
        _logger = logger;
        _environment = environment;
    }

    /// <summary>
    /// Ensures database exists and applies migrations if needed
    /// </summary>
    public async Task EnsureDatabaseAsync()
    {
        try
        {
            // Ensure database is created
            await _context.Database.EnsureCreatedAsync();
            _logger.LogInformation("Database ensured to exist");

            // Create default admin user if no users exist (production safety)
            await EnsureDefaultAdminAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ensuring database exists");
            throw;
        }
    }

    /// <summary>
    /// Recreates the database from scratch and optionally seeds with test data
    /// </summary>
    public async Task MigrateAsync(bool seedTestData = false)
    {
        try
        {
            _logger.LogInformation("Starting database migration...");

            // Delete and recreate database
            await _context.Database.EnsureDeletedAsync();
            await _context.Database.EnsureCreatedAsync();
            
            _logger.LogInformation("Database recreated successfully");

            // Always create default admin
            await EnsureDefaultAdminAsync();

            // Seed test data if requested (typically in development)
            if (seedTestData)
            {
                await SeedTestDataAsync();
                _logger.LogInformation("Test data seeded successfully");
            }

            _logger.LogInformation("Database migration completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during database migration");
            throw;
        }
    }

    /// <summary>
    /// Seeds the database with test data from SQL file
    /// </summary>
    public async Task SeedTestDataAsync()
    {
        try
        {
            var seedFilePath = Path.Combine(_environment.ContentRootPath, "Data", "seed-data.sql");
            
            if (!File.Exists(seedFilePath))
            {
                _logger.LogWarning("Seed data file not found at: {SeedFilePath}", seedFilePath);
                return;
            }

            var sqlContent = await File.ReadAllTextAsync(seedFilePath);
            
            // Split by semicolon to get individual statements
            var statements = sqlContent.Split(';', StringSplitOptions.RemoveEmptyEntries);
            
            foreach (var statement in statements)
            {
                var trimmedStatement = statement.Trim();
                if (!string.IsNullOrEmpty(trimmedStatement))
                {
                    await _context.Database.ExecuteSqlRawAsync(trimmedStatement);
                }
            }

            _logger.LogInformation("Test data seeded from SQL file");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding test data");
            throw;
        }
    }

    /// <summary>
    /// Ensures a default admin user exists (production safety)
    /// </summary>
    private async Task EnsureDefaultAdminAsync()
    {
        if (!await _context.Users.AnyAsync())
        {
            var defaultAdmin = new User
            {
                Username = "admin",
                PasswordHash = HashPassword("admin123"),
                FullName = "System Administrator",
                Email = "admin@webshop.com",
                Role = UserRole.Admin,
                DateCreated = DateTime.UtcNow
            };

            _context.Users.Add(defaultAdmin);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Default admin user created");
        }
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "WebShopSalt2024"));
        return Convert.ToBase64String(hashedBytes);
    }
}