using Microsoft.EntityFrameworkCore;
using WebShop.Data;
using WebShop.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
var defaultConn = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(defaultConn))
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(defaultConn));
}
else
{
    // Fallback to EF InMemory to avoid SQLite transient in-memory connection issues
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseInMemoryDatabase("WebShopDb"));
}

builder.Services.AddSingleton<ISmsServiceManager, SmsServiceManager>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddHttpContextAccessor();

// Add session support
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(2);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DatabaseInitializer.Initialize(db);
}

// Configure default files to serve default.html for root requests
var defaultFilesOptions = new DefaultFilesOptions();
defaultFilesOptions.DefaultFileNames.Clear();
defaultFilesOptions.DefaultFileNames.Add("default.html");
app.UseDefaultFiles(defaultFilesOptions);
app.UseStaticFiles();
// Enable Swagger (UI available at /swagger)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseRouting();
app.UseSession();
app.MapControllers();

app.Run();