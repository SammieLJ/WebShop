@echo off
REM Database migration script for WebShop

if "%1"=="help" (
    echo Usage:
    echo   migrate.bat migrate [seed]  - Recreate database, optionally with test data
    echo   migrate.bat seed            - Add test data to existing database
    echo   migrate.bat help            - Show this help
    goto :eof
)

if "%1"=="migrate" (
    if "%2"=="seed" (
        echo Migrating database with test data...
        curl -X POST "http://localhost:5139/api/migration/migrate?seedTestData=true"
    ) else (
        echo Migrating database (production mode)...
        curl -X POST "http://localhost:5139/api/migration/migrate?seedTestData=false"
    )
    goto :eof
)

if "%1"=="seed" (
    echo Seeding test data...
    curl -X POST "http://localhost:5139/api/migration/seed"
    goto :eof
)

echo Invalid command. Use 'migrate.bat help' for usage information.