using System.Security.Cryptography;
using System.Text;
using WebShop.Models;

namespace WebShop.Data;

public static class DatabaseInitializer
{
    public static void Initialize(AppDbContext context)
    {
        // Ensure database is created (works for InMemory and SQLite)
        context.Database.EnsureCreated();

        // Create default admin user if no users exist
        if (!context.Users.Any())
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

            context.Users.Add(defaultAdmin);
            context.SaveChanges();
        }

        // Seed Articles and SubscriptionPackages if missing
        if (!context.Articles.Any())
        {
            var articles = new[]
            {
                new Article
                {
                    Name = "Professional Camera XYZ",
                    Description = "High-end professional camera with 4K capabilities",
                    Price = 999.99m,
                    SupplierEmail = "supplier1@example.com",
                    DateCreated = DateTime.UtcNow
                },
                new Article
                {
                    Name = "Smartphone Pro Max",
                    Description = "Latest flagship smartphone with advanced features",
                    Price = 799.99m,
                    SupplierEmail = "supplier2@example.com",
                    DateCreated = DateTime.UtcNow
                },
                new Article
                {
                    Name = "Wireless Headphones Elite",
                    Description = "Premium noise-cancelling wireless headphones",
                    Price = 249.99m,
                    SupplierEmail = "supplier3@example.com",
                    DateCreated = DateTime.UtcNow
                },
                new Article
                {
                    Name = "Smart Watch Series 5",
                    Description = "Advanced smartwatch with health monitoring",
                    Price = 299.99m,
                    SupplierEmail = "supplier1@example.com",
                    DateCreated = DateTime.UtcNow
                }
            };

            context.Articles.AddRange(articles);

            var subscriptions = new[]
            {
                new SubscriptionPackage
                {
                    Name = "Monthly Digital Access",
                    Description = "Basic digital access to all our content",
                    Price = 9.99m,
                    DateCreated = DateTime.UtcNow
                },
                new SubscriptionPackage
                {
                    Name = "Premium Monthly Bundle",
                    Description = "Digital access plus monthly physical magazine delivery",
                    Price = 19.99m,
                    DateCreated = DateTime.UtcNow
                },
                new SubscriptionPackage
                {
                    Name = "Annual Digital Plus",
                    Description = "Full year of digital access with exclusive content",
                    Price = 99.99m,
                    DateCreated = DateTime.UtcNow
                },
                new SubscriptionPackage
                {
                    Name = "Premium Annual Bundle",
                    Description = "Complete package with digital access and 12 physical magazines",
                    Price = 189.99m,
                    DateCreated = DateTime.UtcNow
                }
            };

            context.SubscriptionPackages.AddRange(subscriptions);

            context.SaveChanges();
        }

        // Seed Orders (and OrderItems) if missing
        if (!context.Orders.Any())
        {
            // Fetch seeded items
            var articles = context.Articles.ToList();
            var subscriptions = context.SubscriptionPackages.ToList();

            if (articles.Count >= 4 && subscriptions.Count >= 3)
            {
                var order1 = new Order
                {
                    OrderNumber = "ORD-1001",
                    CustomerPhoneNumber = "+38640123456",
                    Status = "Pending",
                    DateCreated = DateTime.UtcNow,
                    SubscriptionPackageId = subscriptions[0].Id
                };
                order1.OrderItems.Add(new OrderItem
                {
                    ArticleId = articles[0].Id,
                    Quantity = 1,
                    Price = articles[0].Price
                });
                order1.OrderItems.Add(new OrderItem
                {
                    ArticleId = articles[1].Id,
                    Quantity = 1,
                    Price = articles[1].Price
                });
                order1.TotalPrice = order1.OrderItems.Sum(i => i.Price * i.Quantity) + (subscriptions[0]?.Price ?? 0m);

                var order2 = new Order
                {
                    OrderNumber = "ORD-1002",
                    CustomerPhoneNumber = "+38640789012",
                    Status = "Confirmed",
                    DateCreated = DateTime.UtcNow.AddDays(-2),
                    SubscriptionPackageId = subscriptions[1].Id
                };
                order2.OrderItems.Add(new OrderItem
                {
                    ArticleId = articles[2].Id,
                    Quantity = 1,
                    Price = articles[2].Price
                });
                order2.TotalPrice = order2.OrderItems.Sum(i => i.Price * i.Quantity) + (subscriptions[1]?.Price ?? 0m);

                var order3 = new Order
                {
                    OrderNumber = "ORD-1003",
                    CustomerPhoneNumber = "+38641234567",
                    Status = "Cancelled",
                    DateCreated = DateTime.UtcNow.AddDays(-10),
                    SubscriptionPackageId = subscriptions[2].Id
                };
                order3.OrderItems.Add(new OrderItem
                {
                    ArticleId = articles[0].Id,
                    Quantity = 1,
                    Price = articles[0].Price
                });
                order3.OrderItems.Add(new OrderItem
                {
                    ArticleId = articles[2].Id,
                    Quantity = 1,
                    Price = articles[2].Price
                });
                order3.OrderItems.Add(new OrderItem
                {
                    ArticleId = articles[3].Id,
                    Quantity = 1,
                    Price = articles[3].Price
                });
                order3.TotalPrice = order3.OrderItems.Sum(i => i.Price * i.Quantity) + (subscriptions[2]?.Price ?? 0m);

                context.Orders.AddRange(order1, order2, order3);
                context.SaveChanges();
            }
        }
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "WebShopSalt2024"));
        return Convert.ToBase64String(hashedBytes);
    }
}