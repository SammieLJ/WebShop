using System.ComponentModel.DataAnnotations;

namespace WebShop.Models;

public class SubscriptionPackage
{
    public int Id { get; set; }

    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    public decimal Price { get; set; }

    public bool IncludesPhysicalMagazine { get; set; } = false;

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
