param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1)]
    [string]$Option
)

$baseUrl = "http://localhost:5139/api/migration"

switch ($Command) {
    "migrate" {
        if ($Option -eq "seed") {
            Write-Host "Migrating database with test data..." -ForegroundColor Green
            Invoke-RestMethod -Uri "$baseUrl/migrate?seedTestData=true" -Method Post
        } else {
            Write-Host "Migrating database (production mode)..." -ForegroundColor Green
            Invoke-RestMethod -Uri "$baseUrl/migrate?seedTestData=false" -Method Post
        }
    }
    "seed" {
        Write-Host "Seeding test data..." -ForegroundColor Green
        Invoke-RestMethod -Uri "$baseUrl/seed" -Method Post
    }
    "help" {
        Write-Host "Database Migration Script for WebShop" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\migrate.ps1 migrate [seed]  - Recreate database, optionally with test data"
        Write-Host "  .\migrate.ps1 seed            - Add test data to existing database"
        Write-Host "  .\migrate.ps1 help            - Show this help"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\migrate.ps1 migrate         - Clean database for production"
        Write-Host "  .\migrate.ps1 migrate seed    - Database with test data for development"
        Write-Host "  .\migrate.ps1 seed            - Add test data to existing database"
    }
    default {
        Write-Host "Invalid command. Use '.\migrate.ps1 help' for usage information." -ForegroundColor Red
    }
}