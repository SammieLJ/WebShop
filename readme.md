# WebShop - Order Management System with User Authentication

A comprehensive web application for managing articles, subscription packages, and orders with SMS notifications and role-based access control.

## Features

- **User Authentication**: Secure login system with session management
- **Role-Based Access Control**: Three user levels with different permissions
- **Article Management**: Create, read, update, and delete articles with supplier information
- **Subscription Packages**: Manage subscription offerings with physical magazine options
- **Order Processing**: Handle customer orders with automatic SMS notifications
- **User Management**: Admin interface for managing users and roles
- **SMS Integration**: Automatic SMS confirmations and status updates
- **Data Validation**: Comprehensive validation for all inputs
- **Responsive Design**: Bootstrap-based UI that works on all devices

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
- `GET /api/articles` - Get all articles
- `GET /api/articles/{id}` - Get specific article
- `POST /api/articles` - Create new article (Editor+)
- `PUT /api/articles/{id}` - Update article (Editor+)
- `DELETE /api/articles/{id}` - Delete article (Editor+)

### Subscription Packages (Editor+ for modifications)
- `GET /api/subscriptionpackages` - Get all packages
- `GET /api/subscriptionpackages/{id}` - Get specific package
- `POST /api/subscriptionpackages` - Create new package (Editor+)
- `PUT /api/subscriptionpackages/{id}` - Update package (Editor+)
- `DELETE /api/subscriptionpackages/{id}` - Delete package (Editor+)

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
- Articles that have been purchased cannot be deleted
- Users cannot delete their own accounts
- Default admin user is created automatically on first run

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

### 3. Security Testing
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
- **Articles**: Products for sale
- **SubscriptionPackages**: Subscription offerings
- **Orders**: Customer orders
- **OrderItems**: Order line items

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

### Permission Denied
- Check user role in navbar
- Verify API endpoint permissions
- Test with admin account first

### Session Timeout
- Sessions expire after 2 hours of inactivity
- User will be redirected to login page
- No data loss - just need to re-authenticate

## Future Enhancements

- JWT token-based authentication
- Password complexity requirements
- Account lockout after failed attempts
- Email verification for new users
- Two-factor authentication
- Audit logging for user actions
- Password reset via email

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