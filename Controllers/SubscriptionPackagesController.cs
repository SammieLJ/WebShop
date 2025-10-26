using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebShop.Data;
using WebShop.Models;
using WebShop.Services;

namespace WebShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionPackagesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISessionService _sessionService;

    public SubscriptionPackagesController(AppDbContext context, ISessionService sessionService)
    {
        _context = context;
        _sessionService = sessionService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SubscriptionPackage>>> GetAll()
    {
        // Editors and Admins see all packages, Regular users see only active ones
        var query = _context.SubscriptionPackages.AsQueryable();
        
        if (!_sessionService.IsEditor())
        {
            query = query.Where(p => p.IsActive);
        }
        
        return await query.OrderByDescending(p => p.DateCreated).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SubscriptionPackage>> Get(int id)
    {
        var item = await _context.SubscriptionPackages.FindAsync(id);
        if (item == null) return NotFound(new { error = "Subscription package not found" });
        return item;
    }

    [HttpPost]
    public async Task<ActionResult<SubscriptionPackage>> Create(SubscriptionPackage package)
    {
        if (!_sessionService.IsEditor())
        {
            return Forbid("Editor or Admin access required");
        }

        if (!ModelState.IsValid) return BadRequest(ModelState);
        package.DateCreated = DateTime.UtcNow;
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = package.Id }, package);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, SubscriptionPackage package)
    {
        if (!_sessionService.IsEditor())
        {
            return Forbid("Editor or Admin access required");
        }

        if (id != package.Id) return BadRequest(new { error = "ID mismatch" });
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var existing = await _context.SubscriptionPackages.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Subscription package not found" });

        existing.Name = package.Name;
        existing.Description = package.Description;
        existing.Price = package.Price;
        existing.IncludesPhysicalMagazine = package.IncludesPhysicalMagazine;
        existing.IsActive = package.IsActive;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!_sessionService.IsEditor())
        {
            return Forbid("Editor or Admin access required");
        }

        var existing = await _context.SubscriptionPackages
            .Include(p => p.Orders)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (existing == null) return NotFound(new { error = "Subscription package not found" });

        if (existing.Orders.Any())
        {
            // Instead of deleting, deactivate the package
            existing.IsActive = false;
            await _context.SaveChangesAsync();
            
            return Ok(new 
            { 
                message = "Subscription package has been deactivated instead of deleted",
                reason = $"This package appears in {existing.Orders.Count} order(s). It has been marked as inactive to preserve order history."
            });
        }

        // If no orders, we can safely delete
        _context.SubscriptionPackages.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
