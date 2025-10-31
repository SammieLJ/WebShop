# WebShop - Order Management System with User Authentication

A comprehensive web application for managing articles, subscription packages, and orders with SMS notifications and role-based access control.

## Features

- **User Authentication**: Secure login system with session management
- **Role-Based Access Control**: Three user levels with different permissions
- **Article Management**: Create, read, update, and deactivate articles with supplier information
- **Subscription Packages**: Manage subscription offerings with physical magazine options
- **Smart Delete System**: Items with orders are deactivated instead of deleted to preserve data integrity
- **Order Processing**: Handle customer orders with automatic SMS notifications
- **User Management**: Admin interface for managing users and roles
- **SMS Integration**: Automatic SMS confirmations and status updates
- **Data Validation**: Comprehensive validation for all inputs
- **Responsive Design**: Bootstrap-based UI that works on all devices
- **Local Vue.js**: Self-contained with no external CDN dependencies

## User Roles

### 1. Regular User (Level 1)
- **Access**: Can make purchases (articles and subscriptions)
- **Permissions**: 
  - View articles and subscription packages
  - Create orders (Make Purchase)
  - View all orders

### 2. Editor (Level 2)
- **Access**: Can manage shop content
- **Permissions**: 
  - All Regular User permissions
  - Create, edit, and delete articles
  - Create, edit, and delete subscription packages
  - View all orders

### 3. Admin (Level 3)
- **Access**: Full system access
- **Permissions**: 
  - All Editor permissions
  - Manage users (create, edit, delete users)
  - Assign user roles
  - Edit order status
  - Delete orders

## Technology Stack

- **Backend**: ASP.NET Core 9.0 with Entity Framework Core
- **Database**: SQLite (with in-memory fallback)
- **Frontend**: Vue.js 3 with Bootstrap 5
- **Authentication**: Session-based authentication with SHA256 password hashing
- **SMS Service**: Configurable SMS service manager

## Getting Started

### Prerequisites

- .NET 9.0 SDK
- Modern web browser

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Run the application:

```bash
dotnet run
```

4. Open your browser and navigate to `http://localhost:5139`

### Default Login

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Admin (full access)

## User Interface Flow

### Login Process
1. Navigate to the application URL
2. You'll be automatically redirected to `/login.html`
3. Enter credentials (use default admin account to start)
4. Upon successful login, you'll be redirected to the main application

### Role-Based Navigation
The application automatically shows different views based on user role:

- **Admin**: Starts with User Management view
- **Editor**: Starts with Articles view  
- **Regular User**: Starts with Make Purchase view

### Navigation Menu
The navigation menu dynamically shows/hides options based on permissions:
- Articles (visible to all authenticated users)
- Subscriptions (visible to all authenticated users)
- Orders (visible to all authenticated users)
- Make Purchase (visible to Regular Users and above)
- Users (visible to Admins only)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/current` - Get current user info

### User Management (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Articles (Editor+ for modifications)
- `GET /api/articles` - Get articles (filtered by role: Editors see all, Users see active only)
- `GET /api/articles/{id}` - Get specific article
- `POST /api/articles` - Create new article (Editor+)
- `PUT /api/articles/{id}` - Update article including IsActive status (Editor+)
- `DELETE /api/articles/{id}` - Smart delete: deactivates if has orders, deletes if none (Editor+)

### Subscription Packages (Editor+ for modifications)
- `GET /api/subscriptionpackages` - Get packages (filtered by role: Editors see all, Users see active only)
- `GET /api/subscriptionpackages/{id}` - Get specific package
- `POST /api/subscriptionpackages` - Create new package (Editor+)
- `PUT /api/subscriptionpackages/{id}` - Update package including IsActive status (Editor+)
- `DELETE /api/subscriptionpackages/{id}` - Smart delete: deactivates if has orders, deletes if none (Editor+)

### Orders
- `GET /api/orders` - Get all orders (Authenticated users)
- `GET /api/orders/{id}` - Get specific order
- `POST /api/orders` - Create new order (Regular User+)
- `PUT /api/orders/{id}/status` - Update order status (Admin only)
- `DELETE /api/orders/{id}` - Delete order (Admin only)

## Business Rules

- Each customer can purchase each unique article only once
- Each customer can have at most one active subscription
- Orders cannot contain duplicate articles
- Confirmed orders cannot be deleted (only cancelled)
- **Smart Delete Protection**: Articles/subscriptions with existing orders are automatically deactivated instead of deleted
- **Data Integrity**: Deactivated items are hidden from new purchases but preserved in order history
- Users cannot delete their own accounts
- Default admin user is created automatically on first run

## Smart Delete System

The application implements intelligent deletion logic to protect business data:

### Articles & Subscription Packages
- **Items with orders**: Automatically deactivated (marked as inactive) instead of deleted
- **Items without orders**: Permanently deleted as normal
- **User feedback**: Clear messages explain whether item was deleted or deactivated

### Status Management
- **Active items**: Visible to all users for new purchases
- **Inactive items**: 
  - Hidden from regular users in purchase views
  - Visible to Editors/Admins with gray background and "Inactive" badge
  - Can be reactivated by editing and checking "Active" checkbox
  - Preserved in all existing order records

### Benefits
- **Data Integrity**: Order history remains complete and accurate
- **Business Continuity**: No broken references in customer orders
- **Flexibility**: Items can be reactivated if needed
- **Audit Trail**: Complete transaction history is maintained

## Security Features

- Password hashing using SHA256 with salt
- Session-based authentication with 2-hour timeout
- Role-based authorization on all endpoints
- Input validation and sanitization
- CSRF protection through session management
- Automatic logout on session expiry

## User Interface Features

The application automatically adapts the interface based on user roles:

### Login Page
- Clean, responsive login form with gradient background
- Real-time validation feedback
- Loading states and error messages
- Default credentials displayed for convenience

### Main Application
- **Navigation**: Role-based menu items
- **Buttons**: Edit/Delete buttons only visible to authorized users
- **Views**: Default view set based on user role
- **User Info**: Current user name and role displayed in navbar
- **Logout**: Accessible from user dropdown menu

### User Management (Admin Only)
- Complete user CRUD operations
- Role assignment with visual badges
- User status management (Active/Inactive)
- Password reset functionality
- Prevent self-deletion

## Testing the Application

### 1. Authentication Testing
```bash
# Default admin login
Username: admin
Password: admin123
```

### 2. Role-Based Access Testing

**As Admin:**
1. Login with admin credentials
2. Navigate to Users tab
3. Create new users with different roles:
   - Regular User: `user1` / `password123`
   - Editor: `editor1` / `password123`
4. Test user management (edit, delete)
5. Test all other features (full access)

**As Editor:**
1. Logout and login as editor
2. Verify access to Articles and Subscriptions management
3. Verify no access to Users tab
4. Test article/subscription CRUD operations

**As Regular User:**
1. Logout and login as regular user
2. Verify access only to Make Purchase
3. Verify read-only access to Articles/Subscriptions
4. Test order creation

### 3. Smart Delete Testing
**Test Article/Subscription Deletion:**
1. Create a test order with some articles/subscriptions
2. As Editor/Admin, try to "delete" those items
3. Verify they become inactive instead of deleted
4. Check that they're hidden from purchase view for regular users
5. Verify they still appear in order history
6. Test reactivating items by editing and checking "Active" checkbox

### 4. Security Testing
- Try accessing `/api/users` without admin role (should return 403)
- Try modifying articles without editor role (should return 403)
- Test session timeout (2 hours)
- Test logout functionality

## SMS Configuration

The application includes a configurable SMS service. To enable SMS functionality:

1. Implement your SMS provider in the `SmsServiceManager`
2. Configure your SMS credentials in `appsettings.json`

## Database

The application uses SQLite by default with automatic database initialization including:
- Sample articles and subscription packages
- Sample orders
- Default admin user (`admin` / `admin123`)

### Database Schema
- **Users**: User accounts with roles and authentication
- **Articles**: Products for sale with IsActive status for soft deletion
- **SubscriptionPackages**: Subscription offerings with IsActive status for soft deletion
- **Orders**: Customer orders with status tracking
- **OrderItems**: Order line items linking articles to orders

## Project Structure

```
WebShop/
├── Models/
│   ├── User.cs              # User model with roles
│   ├── Article.cs           # Article model
│   ├── Order.cs             # Order model
│   └── ...
├── Services/
│   ├── IAuthService.cs      # Authentication interface
│   ├── AuthService.cs       # Authentication implementation
│   ├── ISessionService.cs   # Session management interface
│   ├── SessionService.cs    # Session management implementation
│   └── ...
├── Controllers/
│   ├── AuthController.cs    # Authentication endpoints
│   ├── UsersController.cs   # User management endpoints
│   └── ...
├── Data/
│   ├── AppDbContext.cs      # Database context with Users
│   └── DatabaseInitializer.cs # Seed data including admin user
└── wwwroot/
    ├── login.html           # Login page
    ├── index.html           # Main application (authenticated)
    └── js/app.js            # Vue.js with authentication
```

## Development Notes

### Authentication Flow
1. User submits login form
2. Server validates credentials and creates session
3. Session stores user ID, username, role
4. Frontend checks authentication on page load
5. API endpoints validate session and role permissions

### Session Management
- Sessions stored in server memory
- 2-hour timeout with automatic cleanup
- Session data includes minimal user info (no sensitive data)
- Logout clears session completely

### Role-Based UI
- Vue.js methods check user role for UI elements
- Navigation items conditionally rendered
- Buttons/forms hidden based on permissions
- Default views set based on role level

## Troubleshooting

### Authentication Issues
- Clear browser cookies/session storage
- Check console for authentication errors
- Verify default admin user exists in database
- Ensure Vue.js loads properly (check browser console for Vue errors)

### Permission Denied
- Check user role in navbar
- Verify API endpoint permissions
- Test with admin account first

### Session Timeout
- Sessions expire after 2 hours of inactivity
- User will be redirected to login page
- No data loss - just need to re-authenticate

### Vue.js Loading Issues
- Application uses local Vue.js file (`/js/vue.global.prod.min.js`)
- If Vue fails to load, check browser console for errors
- Fallback mechanism will show error screen after 10 seconds
- No external CDN dependencies - works offline

### Smart Delete Confusion
- Items marked "Inactive" are not deleted - they're preserved for data integrity
- Inactive items can be reactivated by editing them
- Only items without any orders can be permanently deleted
- Check order history if wondering why an item can't be deleted

## Recent Improvements (2025)

### ✅ Smart Delete System
- Implemented IsActive fields for Articles and SubscriptionPackages
- Automatic deactivation instead of deletion for items with orders
- Role-based filtering (Editors see all, Users see active only)
- Visual indicators for inactive items with reactivation capability

### ✅ Enhanced User Experience
- Local Vue.js integration (no CDN dependencies)
- Improved error handling and user feedback
- Better visual distinction between active/inactive items
- Comprehensive session management with proper cookie handling

### ✅ Data Integrity Protection
- Referential integrity preservation through soft deletion
- Complete order history maintenance
- Business rule enforcement at API level
- Graceful handling of deletion attempts on referenced items

## Future Enhancements

- JWT token-based authentication
- Password complexity requirements
- Account lockout after failed attempts
- Email verification for new users
- Two-factor authentication
- Audit logging for user actions
- Password reset via email
- Bulk operations for articles/subscriptions
- Advanced filtering and search capabilities
- Export functionality for orders and reports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test authentication and authorization
5. Submit a pull request

## License

This project is created as a technical assessment demonstration.

## Author

Created as part of a technical assignment - 2025
##
 Database Migration System

The application now uses a production-ready database migration system that separates test data from source code.

### Key Features

- **Persistent SQLite Database**: Database files persist between server restarts
- **Clean Migration**: Ability to flush and recreate database cleanly
- **Separate Test Data**: Test data stored in SQL files, not hardcoded in source
- **Production Ready**: Source code contains no test data, only essential admin user

### Database Files

- **Production**: `webshop.db` (configured in appsettings.json)
- **Development**: `webshop-dev.db` (configured in appsettings.Development.json)
- **Test Data**: `Data/seed-data.sql` (SQL statements for development/testing)

### Migration Commands

#### Using API Endpoints

```bash
# Recreate database (production mode - only admin user)
curl -X POST "http://localhost:5000/api/migration/migrate"

# Recreate database with test data
curl -X POST "http://localhost:5000/api/migration/migrate?seedTestData=true"

# Add test data to existing database
curl -X POST "http://localhost:5000/api/migration/seed"
```

#### Using Batch Script (Windows)

```bash
# Show help
migrate.bat help

# Recreate database (production mode)
migrate.bat migrate

# Recreate database with test data
migrate.bat migrate seed

# Add test data to existing database
migrate.bat seed
```

### Migration Behavior

#### First Run
- Database is created automatically
- Only essential admin user is created
- No test data unless explicitly requested

#### Normal Startup
- Database persists between restarts
- No data loss on server shutdown
- Existing data remains intact

#### Migration Command
- Completely deletes and recreates database
- Always creates admin user for system access
- Optionally seeds test data from SQL file

### Test Data Management

Test data is now stored in `Data/seed-data.sql` and includes:
- Sample articles (cameras, phones, headphones, etc.)
- Subscription packages (monthly, annual, digital, physical)
- Sample orders with order items
- Additional test users

### Production Deployment

For production deployment:
1. Use `migrate.bat migrate` (without seed) to create clean database
2. Only admin user will be created
3. No test data will be present
4. Database will persist between deployments

### Development Workflow

For development:
1. Use `migrate.bat migrate seed` to get fresh database with test data
2. Test data is loaded from SQL file
3. Easy to modify test data by editing `Data/seed-data.sql`
4. Clean separation between code and data

### Security Benefits

- No sensitive test data in source code
- Production deployments are clean by default
- Test data is optional and controlled
- Database credentials in configuration files only