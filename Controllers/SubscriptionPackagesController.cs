using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebShop.Data;
using WebShop.Models;

namespace WebShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionPackagesController : ControllerBase
{
    private readonly AppDbContext _context;

    public SubscriptionPackagesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SubscriptionPackage>>> GetAll()
    {
        return await _context.SubscriptionPackages.OrderByDescending(p => p.DateCreated).ToListAsync();
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
        if (!ModelState.IsValid) return BadRequest(ModelState);
        package.DateCreated = DateTime.UtcNow;
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = package.Id }, package);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, SubscriptionPackage package)
    {
        if (id != package.Id) return BadRequest(new { error = "ID mismatch" });
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var existing = await _context.SubscriptionPackages.FindAsync(id);
        if (existing == null) return NotFound(new { error = "Subscription package not found" });

        existing.Name = package.Name;
        existing.Description = package.Description;
        existing.Price = package.Price;
        existing.IncludesPhysicalMagazine = package.IncludesPhysicalMagazine;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _context.SubscriptionPackages
            .Include(p => p.Orders)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (existing == null) return NotFound(new { error = "Subscription package not found" });

        if (existing.Orders.Any())
        {
            return BadRequest(new { error = "Cannot delete package that has orders" });
        }

        _context.SubscriptionPackages.Remove(existing);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
