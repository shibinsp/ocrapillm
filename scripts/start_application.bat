@echo off
echo ========================================
echo   OCR AI Assistant Application Startup
echo ========================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please copy .env.database to .env and configure your database settings.
    echo See docs/DATABASE_SETUP.md for detailed instructions.
    echo.
    echo Do you want to continue anyway? (Y/N)
    set /p continue="Enter choice: "
    if /i not "%continue%"=="Y" (
        echo Startup cancelled.
        pause
        exit /b 1
    )
    echo.
)

REM Check if virtual environment exists
if not exist ".venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv .venv
    echo Then install dependencies: pip install -r backend/requirements.txt
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "frontend\node_modules" (
    echo ERROR: Frontend dependencies not installed!
    echo Please run: cd frontend && npm install
    echo.
    pause
    exit /b 1
)

echo Database Setup Check...
echo If this is your first time running, make sure to:
echo 1. Configure PostgreSQL database settings in .env
echo 2. Run database migration: python database_migration.py
echo.
echo Press any key to continue with server startup...
pause >nul
echo.

REM Start Backend Server
echo Starting Backend Server...
start "OCR Backend Server" cmd /k "pushd "%~dp0backend" && call ..\.venv\Scripts\activate && echo Backend starting on http://localhost:8001 && uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

REM Wait a moment for backend to start
echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start Frontend Server
echo Starting Frontend Server...
start "OCR Frontend Server" cmd /k "pushd "%~dp0frontend" && echo Frontend starting... && npm start"

echo.
echo ========================================
echo   Application Startup Complete!
echo ========================================
echo Backend Server: http://localhost:8001
echo Frontend App:   http://localhost:3000
echo API Docs:       http://localhost:8001/docs
echo.
echo Both servers are now starting in separate windows.
echo Close this window when you're done (servers will continue running).
echo.
echo Press any key to close this startup window...
pause >nul