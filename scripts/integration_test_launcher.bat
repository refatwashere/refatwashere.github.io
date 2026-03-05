@echo off
REM Integration Test Launcher
REM Runs comprehensive integration tests for the crypto trading app

echo 🧪 Crypto Trading App Integration Test Launcher
echo ===============================================
echo.

if "%1"=="quick" goto quick
if "%1"=="full" goto full
goto help

:quick
echo Running quick health checks...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0integration_test.ps1" -QuickTest
goto end

:full
echo Running full integration test suite...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0integration_test.ps1" -FullTest
goto end

:help
echo Usage: integration_test_launcher.bat [test-type]
echo.
echo Test Types:
echo   quick    Run basic health checks only
echo   full     Run comprehensive integration tests
echo.
echo Examples:
echo   integration_test_launcher.bat quick
echo   integration_test_launcher.bat full
echo.
echo The script will prompt for sidecar URL and token if not provided.
echo.
echo For custom configuration:
echo   powershell.exe -ExecutionPolicy Bypass -File integration_test.ps1 -SidecarUrl "https://your-url" -SidecarToken "your-token"
goto end

:end
echo.
echo Test complete!
pause