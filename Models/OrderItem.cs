using System.ComponentModel.DataAnnotations;

namespace WebShop.Models;

public class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int ArticleId { get; set; }
    public Article Article { get; set; } = null!;

    public int Quantity { get; set; } = 1;

    public decimal Price { get; set; }
}
