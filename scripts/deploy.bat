@echo off
REM OCR AI Assistant - Stagewise Deployment Script
REM Usage: deploy.bat [development|staging|production]

if "%1"=="" (
    echo Usage: deploy.bat [development^|staging^|production]
    echo Current environment files:
    if exist .env echo   - .env (development)
    if exist .env.staging echo   - .env.staging
    if exist .env.production echo   - .env.production
    exit /b 1
)

set STAGE=%1

echo Setting up environment for %STAGE%...

REM Copy appropriate environment file
if "%STAGE%"=="development" (
    if exist .env (
        echo Using existing .env for development
    ) else (
        echo Error: .env file not found for development
        exit /b 1
    )
) else if "%STAGE%"=="staging" (
    if exist .env.staging (
        copy .env.staging .env.current
        echo Environment configured for staging
    ) else (
        echo Error: .env.staging file not found
        exit /b 1
    )
) else if "%STAGE%"=="production" (
    if exist .env.production (
        copy .env.production .env.current
        echo Environment configured for production
    ) else (
        echo Error: .env.production file not found
        exit /b 1
    )
) else (
    echo Error: Invalid stage '%STAGE%'. Use development, staging, or production
    exit /b 1
)

echo.
echo Stage-wise deployment setup complete for %STAGE%!
echo.
echo Next steps:
echo 1. Update the environment variables in the appropriate .env file
echo 2. Configure PostgreSQL database settings
echo 3. Run database migration: python database_migration.py
echo 4. Install dependencies if not already done:
echo    - Backend: pip install -r backend/requirements.txt
echo    - Frontend: cd frontend ^&^& npm install
echo 5. Run the application using: scripts/start_application.bat
echo.
echo Environment files:
echo   - .env (development - default)
echo   - .env.staging (staging environment)
echo   - .env.production (production environment)
echo   - .env.current (currently active for non-development)
echo   - .env.database (template for database configuration)
echo.
echo Database Setup:
echo   - See docs/DATABASE_SETUP.md for detailed instructions
echo   - Ensure PostgreSQL is installed and running
echo   - Configure database credentials in your .env file

pause