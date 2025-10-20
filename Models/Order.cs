using System.ComponentModel.DataAnnotations;

namespace WebShop.Models;

public class Order
{
    public int Id { get; set; }

    [Required]
    public string OrderNumber { get; set; } = string.Empty;

    [Required]
    public string CustomerPhoneNumber { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = "Pending";

    public decimal TotalPrice { get; set; }

    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    // Optional subscription
    public int? SubscriptionPackageId { get; set; }
    public SubscriptionPackage? SubscriptionPackage { get; set; }

    // Navigation
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
