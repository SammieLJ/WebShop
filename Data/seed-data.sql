INSERT INTO Articles (Name, Description, Price, SupplierEmail, IsActive, DateCreated) VALUES
('Professional Camera XYZ', 'High-end professional camera with 4K capabilities', 999.99, 'supplier1@example.com', 1, datetime('now')),
('Smartphone Pro Max', 'Latest flagship smartphone with advanced features', 799.99, 'supplier2@example.com', 1, datetime('now')),
('Wireless Headphones Elite', 'Premium noise-cancelling wireless headphones', 249.99, 'supplier3@example.com', 1, datetime('now')),
('Smart Watch Series 5', 'Advanced smartwatch with health monitoring', 299.99, 'supplier1@example.com', 1, datetime('now'));

INSERT INTO SubscriptionPackages (Name, Description, Price, IncludesPhysicalMagazine, IsActive, DateCreated) VALUES
('Monthly Digital Access', 'Basic digital access to all our content', 9.99, 0, 1, datetime('now')),
('Premium Monthly Bundle', 'Digital access plus monthly physical magazine delivery', 19.99, 1, 1, datetime('now')),
('Annual Digital Plus', 'Full year of digital access with exclusive content', 99.99, 0, 1, datetime('now')),
('Premium Annual Bundle', 'Complete package with digital access and 12 physical magazines', 189.99, 1, 1, datetime('now'));

INSERT INTO Orders (OrderNumber, CustomerPhoneNumber, Status, TotalPrice, SubscriptionPackageId, DateCreated) VALUES
('ORD-1001', '+38640123456', 'Pending', 1819.97, 1, datetime('now')),
('ORD-1002', '+38640789012', 'Confirmed', 269.98, 2, datetime('now', '-2 days')),
('ORD-1003', '+38641234567', 'Cancelled', 1649.96, 3, datetime('now', '-10 days'));

INSERT INTO OrderItems (OrderId, ArticleId, Quantity, Price) VALUES
(1, 1, 1, 999.99),
(1, 2, 1, 799.99),
(2, 3, 1, 249.99),
(3, 1, 1, 999.99),
(3, 3, 1, 249.99),
(3, 4, 1, 299.99);