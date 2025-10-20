# WebShop - Order Management System

A full-stack web application built with ASP.NET Core 9.0, Vue.js 3, and SQLite for managing articles, subscription packages, and customer orders.

## Features

### Core Functionality
- **Article Management**: Create, read, update, and delete articles with validation
- **Subscription Package Management**: Manage subscription offerings (digital and physical magazines)
- **Order Processing**: Place orders with multiple articles and/or subscription packages
- **Customer Tracking**: Identify customers by phone number
- **SMS Notifications**: Automatic SMS alerts for order confirmations and status updates

### Business Rules
- Each customer can purchase each unique article only once
- Each customer can have at most one active subscription
- Purchased items/packages cannot be deleted (maintains order history integrity)
- Only pending orders can be deleted
- Automatic rate limiting and failover for SMS services (5 SMS/minute per service)

### Technical Features
- **Error Handling**: Comprehensive error detection and user-friendly messages
- **Data Validation**: Client and server-side validation
- **Database Migrations**: Automatic database creation with Entity Framework Core
- **RESTful API**: Clean API endpoints for all CRUD operations
- **Responsive Design**: Bootstrap 5 for mobile-friendly interface
- **SMS Service Architecture**: Dual SMS provider with automatic failover

## Technology Stack

- **Backend**: ASP.NET Core 9.0, C#
- **Database**: SQLite with Entity Framework Core
- **Frontend**: Vue.js 3, Bootstrap 5, Font Awesome
- **Architecture**: RESTful API, MVC pattern

## Installation & Setup (Windows 11)

### Prerequisites
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- Git
- A code editor (Visual Studio, VS Code, or Rider)

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd WebShop
```

### Step 2: Restore Dependencies
```bash
dotnet restore
```

### Step 3: Database Setup

**Baza podatkov se ustvari AVTOMATSKO ob prvem zagonu aplikacije!**

Entity Framework Code First pristop ustvari SQLite bazo in tabele samodejno na podlagi C# modelov. Ne potrebuješ ročno izvajati SQL ukazov.

Če pa vseeno želiš **ročno pregledati ali ustvariti bazo**:

#### Opcija A: Avtomatsko (priporočeno)
Samo zaženi aplikacijo in EF Core bo ustvaril bazo:
```bash
dotnet run
```

Baza `webshop.db` bo ustvarjena v korenski mapi projekta.

#### Opcija B: Ročno z SQLite orodji (če želiš pregledati bazo)

1. **Prenesi SQLite Tools za Windows:**
   - Obišči: https://www.sqlite.org/download.html
   - Prenesi "sqlite-tools-win-x64-XXXXXXX.zip"
   - Razširi ZIP v mapo (npr. `C:\sqlite`)

2. **Dodaj v PATH (opcijsko):**
   - Desni klik na "This PC" → Properties
   - Advanced system settings → Environment Variables
   - V System Variables najdi "Path" in klikni Edit
   - Dodaj pot do sqlite mape (npr. `C:\sqlite`)

3. **Odpri bazo in preveri:**
   ```bash
   # V korenski mapi projekta
   sqlite3 webshop.db
   
   # V SQLite konzoli:
   .tables              # Prikaže vse tabele
   .schema Articles     # Prikaže strukturo tabele
   SELECT * FROM Articles;  # Prikaže podatke
   .quit                # Izhod
   ```

#### Opcija C: Uporabi DB Browser for SQLite (GUI)
1. Prenesi: https://sqlitebrowser.org/dl/
2. Namesti aplikacijo
3. Odpri `webshop.db` datoteko
4. Grafični vmesnik omogoča pregled in urejanje podatkov

### Step 4: Run the Application
```bash
dotnet run
```

Aplikacija bo dostopna na:
- **HTTP**: http://localhost:5000
- **HTTPS**: https://localhost:5001

### Step 5: Access the Application
Odpri brskalnik in pojdi na `http://localhost:5000`

## Database Schema

Aplikacija uporablja Entity Framework Code First, tako da se baza ustvari iz C# modelov. SQL shema je definirana v komentarjih v `Data/AppDbContext.cs`.

### Tables Created Automatically:
- **Articles**: Articles/products for sale
- **SubscriptionPackages**: Subscription offerings
- **Orders**: Customer orders
- **OrderItems**: Junction table for order-article relationships

### Initial Seed Data:
Aplikacija ob prvem zagonu doda testne podatke:
- 5 testnih artiklov
- 4 testne naročniške pakete

## Project Structure

```
WebShop/
├── Models/              # Data models (Article, Order, etc.)
├── Data/                # Database context and initialization
├── Services/            # SMS service implementations
├── Controllers/         # API controllers
└── wwwroot/             # Static files (HTML, CSS, JS)
    ├── index.html       # Main SPA page
    ├── css/site.css     # Custom styles
    └── js/app.js        # Vue.js application
```

## API Endpoints

### Articles
- `GET /api/articles` - Get all articles
- `GET /api/articles/{id}` - Get article by ID
- `POST /api/articles` - Create new article
- `PUT /api/articles/{id}` - Update article
- `DELETE /api/articles/{id}` - Delete article

### Subscription Packages
- `GET /api/subscriptionpackages` - Get all packages
- `GET /api/subscriptionpackages/{id}` - Get package by ID
- `POST /api/subscriptionpackages` - Create new package
- `PUT /api/subscriptionpackages/{id}` - Update package
- `DELETE /api/subscriptionpackages/{id}` - Delete package

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/{id}` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/{id}/status` - Update order status
- `DELETE /api/orders/{id}` - Delete order

## SMS Service Architecture

The application implements a dual SMS service provider system:

### Design Pattern
- **Strategy Pattern**: Interface-based SMS service abstraction
- **Rate Limiting**: Sliding window algorithm (5 SMS/minute per service)
- **Automatic Failover**: Switches to backup service when limit reached
- **Singleton Manager**: Thread-safe SMS service coordination

### Implementation
```csharp
// Send SMS with automatic failover
await _smsService.SendSmsAsync(phoneNumber, message);
```

The `SmsServiceManager` automatically:
1. Tries primary service (SmsService1)
2. Falls back to secondary service (SmsService2) if limit reached
3. Tracks usage with sliding window for accurate rate limiting
4. Logs service usage for monitoring

## Development Notes

### Error Handling
- All API endpoints include try-catch blocks
- User-friendly error messages returned as JSON
- Validation errors include detailed field information

### Business Logic Highlights
- **Duplicate Purchase Prevention**: Checks existing orders before creating new ones
- **Subscription Limits**: Validates one subscription per customer
- **Cascade Delete Prevention**: Prevents deletion of purchased items
- **Phone Number Validation**: E.164 international format

### Performance Considerations
- Database indexes on frequently queried fields (phone number, order number)
- Eager loading for related entities (Include/ThenInclude)
- Efficient LINQ queries with projection for API responses

## Testing the Application

### Sample Test Flow
1. Navigate to **Articles** tab
2. Add a new article
3. Navigate to **Subscriptions** tab
4. Add a subscription package
5. Navigate to **Make Purchase** tab
6. Enter phone number: `+38640123456`
7. Select items and place order
8. Check **Orders** tab to view created order
9. Try to purchase the same items again (should fail with validation message)

## Troubleshooting

### Database Issues
If database gets corrupted, simply delete `webshop.db` and restart the application. It will be recreated automatically.

### Port Already in Use
Change the port in `Program.cs` or `launchSettings.json`

### SQLite Locked Database
Close any open connections in DB Browser or sqlite3 console

## Git Repository Setup

```bash
# Initialize repository
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: WebShop order management system"

# Add remote (GitHub/GitLab/Bitbucket)
git remote add origin <your-repo-url>

# Push to remote
git push -u origin main
```

## Future Enhancements

- User authentication and authorization
- Advanced search and filtering
- Order history reports
- Email notifications
- Payment integration
- Image upload for articles
- Advanced analytics dashboard

## License

This project is created as a technical assessment demonstration.

## Author

Created as part of a technical assignment - 2024