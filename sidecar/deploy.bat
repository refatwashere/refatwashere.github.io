@echo off
REM Crypto Sidecar Deployment Launcher
REM This batch file launches PowerShell scripts with execution policy bypass

echo 🚀 Crypto Sidecar Deployment Launcher
echo =====================================
echo.

if "%1"=="install" goto install
if "%1"=="deploy" goto deploy
if "%1"=="test" goto test
if "%1"=="token" goto token
goto help

:install
echo Installing Railway CLI...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -InstallRailway
goto end

:deploy
echo Deploying to Railway...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -Deploy
goto end

:test
echo Testing deployment...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -Test
goto end

:token
echo Generating secure token...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0generate_token.ps1"
goto end

:help
echo Usage: deploy.bat [command]
echo.
echo Commands:
echo   install    Install Railway CLI
echo   deploy     Deploy sidecar to Railway
echo   test       Test deployed sidecar
echo   token      Generate secure authentication token
echo.
echo Examples:
echo   deploy.bat install
echo   deploy.bat deploy
echo   deploy.bat test
echo   deploy.bat token
echo.
echo For more options, run PowerShell scripts directly:
echo   powershell.exe -ExecutionPolicy Bypass -File deploy.ps1 -InstallRailway
goto end

:end
echo.
echo Done!
pause
echo 4. Run integration tests
echo.
echo 🎉 Deployment complete!

pause