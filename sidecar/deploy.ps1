# PowerShell Deployment Script for Railway CLI
# This script bypasses execution policy restrictions

param(
    [switch]$InstallRailway,
    [switch]$Deploy,
    [switch]$Test,
    [string]$Token
)

Write-Host "🚀 Crypto Sidecar Deployment Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Yellow

# Function to install Railway CLI
function Install-RailwayCLI {
    Write-Host "Installing Railway CLI..." -ForegroundColor Cyan

    try {
        # Try npm installation with execution policy bypass
        $npmCommand = "npm install -g @railway/cli"
        Write-Host "Running: $npmCommand" -ForegroundColor Gray

        # Use Start-Process to bypass execution policy
        $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -Command $npmCommand" -NoNewWindow -Wait -PassThru

        if ($process.ExitCode -eq 0) {
            Write-Host "✅ Railway CLI installed successfully!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Railway CLI installation failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Error installing Railway CLI: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check Railway CLI
function Test-RailwayCLI {
    Write-Host "Checking Railway CLI..." -ForegroundColor Cyan

    try {
        $version = & railway --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Railway CLI is available: $version" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Railway CLI not found" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Railway CLI not available" -ForegroundColor Red
        return $false
    }
}

# Function to deploy
function Deploy-Sidecar {
    param([string]$AuthToken)

    Write-Host "Deploying sidecar to Railway..." -ForegroundColor Cyan

    if (-not $AuthToken) {
        $AuthToken = Read-Host "Enter PLANNER_SIDECAR_TOKEN"
    }

    try {
        # Login to Railway
        Write-Host "Logging into Railway..." -ForegroundColor Gray
        & railway login

        # Create project
        Write-Host "Creating Railway project..." -ForegroundColor Gray
        & railway init crypto-sidecar-enhanced --yes

        # Set environment variable
        Write-Host "Setting environment variables..." -ForegroundColor Gray
        & railway variables set PLANNER_SIDECAR_TOKEN=$AuthToken

        # Deploy
        Write-Host "Deploying..." -ForegroundColor Gray
        & railway up

        Write-Host "✅ Deployment initiated!" -ForegroundColor Green
        Write-Host "Check Railway dashboard for deployment status" -ForegroundColor Yellow

    }
    catch {
        Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to test deployment
function Test-Deployment {
    Write-Host "Testing deployment..." -ForegroundColor Cyan

    $url = Read-Host "Enter Railway deployment URL (e.g., https://crypto-sidecar-enhanced-production.up.railway.app)"

    try {
        # Test health endpoint
        Write-Host "Testing health endpoint..." -ForegroundColor Gray
        $healthResponse = Invoke-RestMethod -Uri "$url/health" -Method Get

        if ($healthResponse.data.ready -eq $true) {
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            Write-Host "Version: $($healthResponse.data.version)" -ForegroundColor Gray
            Write-Host "Features: $($healthResponse.data.features -join ', ')" -ForegroundColor Gray
        } else {
            Write-Host "❌ Health check failed" -ForegroundColor Red
        }

        # Test planner endpoint
        Write-Host "Testing planner endpoint..." -ForegroundColor Gray
        $testData = @{
            venue = "pancakeswap"
            tokenIn = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"
            tokenOut = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
            amountIn = "1.0"
            chainId = 56
        } | ConvertTo-Json

        $token = Read-Host "Enter PLANNER_SIDECAR_TOKEN for testing"

        $headers = @{
            "Content-Type" = "application/json"
            "X-Planner-Token" = $token
        }

        $plannerResponse = Invoke-RestMethod -Uri "$url/planner/intent" -Method Post -Body $testData -Headers $headers

        if ($plannerResponse.success -eq $true) {
            Write-Host "✅ Planner endpoint working!" -ForegroundColor Green
            Write-Host "Confidence: $($plannerResponse.data.confidence)%" -ForegroundColor Gray
        } else {
            Write-Host "❌ Planner endpoint failed" -ForegroundColor Red
        }

    }
    catch {
        Write-Host "❌ Testing failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Main execution
if ($InstallRailway) {
    Install-RailwayCLI
}
elseif ($Deploy) {
    if (Test-RailwayCLI) {
        Deploy-Sidecar -AuthToken $Token
    } else {
        Write-Host "Railway CLI not available. Installing first..." -ForegroundColor Yellow
        if (Install-RailwayCLI) {
            Deploy-Sidecar -AuthToken $Token
        }
    }
}
elseif ($Test) {
    Test-Deployment
}
else {
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 -InstallRailway    # Install Railway CLI" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1 -Deploy           # Deploy to Railway" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1 -Test             # Test deployment" -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 -InstallRailway" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1 -Deploy -Token 'your-token-here'" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1 -Test" -ForegroundColor Gray
}