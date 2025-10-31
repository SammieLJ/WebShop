using Microsoft.AspNetCore.Mvc;
using WebShop.Data;

namespace WebShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MigrationController : ControllerBase
{
    private readonly DatabaseMigrator _migrator;
    private readonly ILogger<MigrationController> _logger;

    public MigrationController(DatabaseMigrator migrator, ILogger<MigrationController> logger)
    {
        _migrator = migrator;
        _logger = logger;
    }

    /// <summary>
    /// Recreates the database and optionally seeds test data
    /// </summary>
    [HttpPost("migrate")]
    public async Task<IActionResult> Migrate([FromQuery] bool seedTestData = false)
    {
        try
        {
            await _migrator.MigrateAsync(seedTestData);
            
            var message = seedTestData 
                ? "Database migrated successfully with test data" 
                : "Database migrated successfully (production mode)";
                
            return Ok(new { message, seedTestData });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Migration failed");
            return StatusCode(500, new { error = "Migration failed", details = ex.Message });
        }
    }

    /// <summary>
    /// Seeds test data into existing database
    /// </summary>
    [HttpPost("seed")]
    public async Task<IActionResult> SeedTestData()
    {
        try
        {
            await _migrator.SeedTestDataAsync();
            return Ok(new { message = "Test data seeded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Seeding failed");
            return StatusCode(500, new { error = "Seeding failed", details = ex.Message });
        }
    }
}