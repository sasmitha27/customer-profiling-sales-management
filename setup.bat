@echo off
REM Customer Profiling & Sales Management System
REM Setup Script for Windows

echo Setting up Customer Profiling ^& Sales Management System...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker is not running. Please start Docker and try again.
    exit /b 1
)

echo Docker is running

REM Create necessary directories
echo Creating directories...
if not exist backend\uploads mkdir backend\uploads
if not exist backend\logs mkdir backend\logs

REM Copy environment file if not exists
if not exist backend\.env (
    echo Creating backend .env file...
    copy backend\.env.example backend\.env
    echo Please update backend\.env with your configuration
)

REM Build and start services
echo Building and starting Docker containers...
docker-compose up -d --build

echo Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Check if backend is healthy
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo Backend is not responding
    echo Check logs with: docker-compose logs backend
) else (
    echo Backend is running
)

REM Check if frontend is accessible
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
    echo Frontend is not responding
    echo Check logs with: docker-compose logs frontend
) else (
    echo Frontend is running
)

echo.
echo Setup complete!
echo.
echo Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo Login credentials:
echo    Username: admin
echo    Password: adminpass
echo.
echo Documentation:
echo    README.md - Full documentation
echo    QUICKSTART.md - Quick start guide
echo    PROJECT_SUMMARY.md - Project overview
echo.
echo Useful commands:
echo    docker-compose logs -f          # View logs
echo    docker-compose ps               # Check status
echo    docker-compose restart          # Restart services
echo    docker-compose down             # Stop services
echo    docker-compose down -v          # Stop and remove volumes
echo.

pause
