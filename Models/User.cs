using System.ComponentModel.DataAnnotations;

namespace WebShop.Models;

public class User
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public required string Username { get; set; }
    
    [Required]
    [MaxLength(255)]
    public required string PasswordHash { get; set; }
    
    [Required]
    [MaxLength(100)]
    public required string FullName { get; set; }
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public required string Email { get; set; }
    
    [Required]
    public UserRole Role { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastLogin { get; set; }
}

public enum UserRole
{
    RegularUser = 1,  // Can buy articles and subscriptions
    Editor = 2,       // Can edit articles, subscriptions, and purchase items
    Admin = 3         // Can manage users and edit all orders
}