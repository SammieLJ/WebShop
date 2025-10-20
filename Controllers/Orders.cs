using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebShop.Data;
using WebShop.Models;
using WebShop.Services;

namespace WebShop.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ISmsServiceManager _smsService;

    public OrdersController(AppDbContext context, ISmsServiceManager smsService)
    {
        _context = context;
        _smsService = smsService;
    }

    // GET: api/orders
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetOrders()
    {
        try
        {
            var orders = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Article)
                .Include(o => o.SubscriptionPackage)
                .OrderByDescending(o => o.DateCreated)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.CustomerPhoneNumber,
                    o.Status,
                    o.TotalPrice,
                    o.DateCreated,
                    Articles = o.OrderItems.Select(oi => new
                    {
                        oi.ArticleId,
                        oi.Article.Name,
                        oi.Quantity,
                        oi.Price
                    }),
                    SubscriptionPackage = o.SubscriptionPackage != null ? new
                    {
                        o.SubscriptionPackage.Id,
                        o.SubscriptionPackage.Name,
                        o.SubscriptionPackage.Price
                    } : null
                })
                .ToListAsync();

            return Ok(orders);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error retrieving orders", details = ex.Message });
        }
    }

    // GET: api/orders/5
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetOrder(int id)
    {
        try
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Article)
                .Include(o => o.SubscriptionPackage)
                .Where(o => o.Id == id)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.CustomerPhoneNumber,
                    o.Status,
                    o.TotalPrice,
                    o.DateCreated,
                    Articles = o.OrderItems.Select(oi => new
                    {
                        oi.ArticleId,
                        oi.Article.Name,
                        oi.Quantity,
                        oi.Price
                    }),
                    SubscriptionPackage = o.SubscriptionPackage != null ? new
                    {
                        o.SubscriptionPackage.Id,
                        o.SubscriptionPackage.Name,
                        o.SubscriptionPackage.Price
                    } : null
                })
                .FirstOrDefaultAsync();

            if (order == null)
            {
                return NotFound(new { error = "Order not found" });
            }

            return order;
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error retrieving order", details = ex.Message });
        }
    }

    // POST: api/orders
    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.CustomerPhoneNumber))
            {
                return BadRequest(new { error = "Phone number is required" });
            }

            if ((request.ArticleIds == null || !request.ArticleIds.Any()) && request.SubscriptionPackageId == null)
            {
                return BadRequest(new { error = "Order must contain at least one article or subscription package" });
            }

            // Check if customer already has a subscription
            if (request.SubscriptionPackageId.HasValue)
            {
                var existingSubscription = await _context.Orders
                    .Where(o => o.CustomerPhoneNumber == request.CustomerPhoneNumber 
                            && o.SubscriptionPackageId.HasValue
                            && o.Status != "Cancelled")
                    .AnyAsync();

                if (existingSubscription)
                {
                    return BadRequest(new 
                    { 
                        error = "Customer already has an active subscription",
                        message = "Each customer can have at most one subscription agreement. Please cancel the existing subscription before purchasing a new one."
                    });
                }
            }

            // Check for duplicate articles in current order
            if (request.ArticleIds != null && request.ArticleIds.Distinct().Count() != request.ArticleIds.Count())
            {
                return BadRequest(new { error = "Cannot order the same article multiple times in one order" });
            }

            // Check if customer already purchased these articles
            if (request.ArticleIds != null && request.ArticleIds.Any())
            {
                var purchasedArticles = await _context.OrderItems
                    .Include(oi => oi.Order)
                    .Where(oi => request.ArticleIds.Contains(oi.ArticleId) 
                            && oi.Order.CustomerPhoneNumber == request.CustomerPhoneNumber
                            && oi.Order.Status != "Cancelled")
                    .Select(oi => oi.Article.Name)
                    .ToListAsync();

                if (purchasedArticles.Any())
                {
                    return BadRequest(new 
                    { 
                        error = "Customer already purchased some of these articles",
                        message = $"Customer has already purchased: {string.Join(", ", purchasedArticles)}. Each customer can purchase each unique item only once.",
                        purchasedArticles
                    });
                }
            }

            // Create order
            var order = new Order
            {
                OrderNumber = GenerateOrderNumber(),
                CustomerPhoneNumber = request.CustomerPhoneNumber,
                Status = "Pending",
                TotalPrice = 0,
                SubscriptionPackageId = request.SubscriptionPackageId,
                DateCreated = DateTime.UtcNow
            };

            decimal totalPrice = 0;

            // Add subscription package
            if (request.SubscriptionPackageId.HasValue)
            {
                var package = await _context.SubscriptionPackages.FindAsync(request.SubscriptionPackageId.Value);
                if (package == null)
                {
                    return BadRequest(new { error = "Subscription package not found" });
                }
                totalPrice += package.Price;
            }

            // Add articles
            if (request.ArticleIds != null && request.ArticleIds.Any())
            {
                var articles = await _context.Articles
                    .Where(a => request.ArticleIds.Contains(a.Id))
                    .ToListAsync();

                if (articles.Count != request.ArticleIds.Count())
                {
                    return BadRequest(new { error = "One or more articles not found" });
                }

                foreach (var article in articles)
                {
                    order.OrderItems.Add(new OrderItem
                    {
                        ArticleId = article.Id,
                        Quantity = 1,
                        Price = article.Price
                    });
                    totalPrice += article.Price;
                }
            }

            order.TotalPrice = totalPrice;

            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // Send SMS notification
            try
            {
                var smsContent = $"Order {order.OrderNumber} confirmed! Total: €{order.TotalPrice:F2}. Thank you for your purchase!";
                await _smsService.SendSmsAsync(order.CustomerPhoneNumber, smsContent);
            }
            catch (Exception smsEx)
            {
                // Log SMS error but don't fail the order
                Console.WriteLine($"SMS sending failed: {smsEx.Message}");
            }

            // Return created order with details
            var createdOrder = await _context.Orders
                .Include(o => o.OrderItems)
                    .ThenInclude(oi => oi.Article)
                .Include(o => o.SubscriptionPackage)
                .FirstOrDefaultAsync(o => o.Id == order.Id);

            return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, createdOrder);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error creating order", details = ex.Message });
        }
    }

    // PUT: api/orders/5/status
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest request)
    {
        try
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
            {
                return NotFound(new { error = "Order not found" });
            }

            if (string.IsNullOrWhiteSpace(request.Status))
            {
                return BadRequest(new { error = "Status is required" });
            }

            var validStatuses = new[] { "Pending", "Confirmed", "Cancelled" };
            if (!validStatuses.Contains(request.Status))
            {
                return BadRequest(new { error = $"Invalid status. Must be one of: {string.Join(", ", validStatuses)}" });
            }

            order.Status = request.Status;
            await _context.SaveChangesAsync();

            // Send SMS notification about status change
            try
            {
                var smsContent = $"Order {order.OrderNumber} status updated to: {request.Status}";
                await _smsService.SendSmsAsync(order.CustomerPhoneNumber, smsContent);
            }
            catch (Exception smsEx)
            {
                Console.WriteLine($"SMS sending failed: {smsEx.Message}");
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error updating order status", details = ex.Message });
        }
    }

    // DELETE: api/orders/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(int id)
    {
        try
        {
            var order = await _context.Orders
                .Include(o => o.OrderItems)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
            {
                return NotFound(new { error = "Order not found" });
            }

            // Only allow deletion of pending orders
            if (order.Status == "Confirmed")
            {
                return BadRequest(new 
                { 
                    error = "Cannot delete confirmed orders",
                    message = "Confirmed orders cannot be deleted. Please cancel the order first if needed."
                });
            }

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error deleting order", details = ex.Message });
        }
    }

    private string GenerateOrderNumber()
    {
        return $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";
    }
}

public class CreateOrderRequest
{
    public string CustomerPhoneNumber { get; set; } = string.Empty;
    public List<int>? ArticleIds { get; set; }
    public int? SubscriptionPackageId { get; set; }
}

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
}