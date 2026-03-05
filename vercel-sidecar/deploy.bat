@echo off
REM Vercel Serverless Sidecar Deployment Script (100%% FREE)
REM This script deploys your sidecar to Vercel serverless functions

echo 🚀 Crypto Sidecar - Vercel Serverless Deployment (100%% FREE)
echo ============================================================
echo.

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Vercel CLI
        echo Please install Node.js from https://nodejs.org
        pause
        exit /b 1
    )
)

REM Check if logged in
echo 🔐 Checking Vercel authentication...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo Please login to Vercel:
    vercel login
    if %errorlevel% neq 0 (
        echo ❌ Vercel login failed
        pause
        exit /b 1
    )
)

REM Navigate to vercel-sidecar directory
cd vercel-sidecar
if %errorlevel% neq 0 (
    echo ❌ Could not find vercel-sidecar directory
    echo Please run this script from the project root
    pause
    exit /b 1
)

echo 📁 Deploying from: %CD%
echo.

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
vercel --prod

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    pause
    exit /b 1
)

echo.
echo ✅ Deployment successful!
echo.
echo 📋 Next Steps:
echo 1. Copy the deployment URL shown above
echo 2. Set PLANNER_SIDECAR_URL in your InfinityFree .htaccess
echo 3. Set PLANNER_SIDECAR_TOKEN environment variable in Vercel dashboard
echo 4. Run integration tests
echo.
echo Example .htaccess configuration:
echo SetEnv PLANNER_SIDECAR_URL https://your-project.vercel.app/api/planner
echo SetEnv PLANNER_SIDECAR_TOKEN your-secure-token
echo.

REM Generate token if requested
set /p generate_token="Generate a secure token? (y/n): "
if /i "%generate_token%"=="y" (
    echo.
    echo 🔐 Generating secure token...
    for /f %%i in ('powershell -command "$token = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | %% {[char]$_}); echo $token"') do set SECURE_TOKEN=%%i
    echo Your secure token: %SECURE_TOKEN%
    echo.
    echo Save this token and use it in:
    echo - Vercel dashboard environment variables
    echo - InfinityFree .htaccess SetEnv PLANNER_SIDECAR_TOKEN
    echo.
)

echo 🎉 Your sidecar is now running 100%% FREE on Vercel!
echo Test it at: [your-deployment-url]/api/health

pause