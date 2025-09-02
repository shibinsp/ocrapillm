@echo off
echo Starting OCR AI Assistant Application...
echo.

REM Start Backend Server
echo Starting Backend Server...
start "Backend Server" cmd /k pushd "%~dp0backend" ^&^& call ..\.venv\Scripts\activate ^&^& uvicorn main:app --host 0.0.0.0 --port 8001 --reload

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend Server
echo Starting Frontend Server...
start "Frontend Server" cmd /k pushd "%~dp0frontend" ^&^& npm start

echo.
echo Both servers are starting...
echo Backend will be available at: http://localhost:8001
echo Frontend will be available at: http://localhost:3000 or http://localhost:3001
echo.
echo Press any key to exit this window (servers will continue running)...
pause >nul