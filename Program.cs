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

app.UseDefaultFiles();
app.UseStaticFiles();
// Enable Swagger (UI available at /swagger)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseRouting();
app.MapControllers();

app.Run();