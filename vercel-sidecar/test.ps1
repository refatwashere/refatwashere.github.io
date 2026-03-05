# Test script for Vercel serverless sidecar

param(
    [string]$VercelUrl,
    [string]$Token
)

Write-Host "🧪 Testing Vercel Serverless Sidecar" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Yellow

if (-not $VercelUrl) {
    $VercelUrl = Read-Host "Enter your Vercel deployment URL (e.g., https://your-project.vercel.app)"
}

if (-not $Token) {
    $Token = Read-Host "Enter your PLANNER_SIDECAR_TOKEN"
}

$healthUrl = "$VercelUrl/api/health"
$plannerUrl = "$VercelUrl/api/planner"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Health URL: $healthUrl" -ForegroundColor Gray
Write-Host "  Planner URL: $plannerUrl" -ForegroundColor Gray
Write-Host "  Token: $($Token.Substring(0,8))..." -ForegroundColor Gray
Write-Host ""

# Test health endpoint
Write-Host "Testing health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get
    if ($response.data.ready -eq $true) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "   Version: $($response.data.version)" -ForegroundColor Gray
        Write-Host "   Features: $($response.data.features -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "❌ Health check failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health check error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test planner endpoint
Write-Host "Testing planner endpoint..." -ForegroundColor Cyan
try {
    $testData = @{
        venue = "pancakeswap"
        tokenIn = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82"
        tokenOut = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
        amountIn = "1.0"
        chainId = 56
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
        "X-Planner-Token" = $Token
    }

    $response = Invoke-RestMethod -Uri $plannerUrl -Method Post -Body $testData -Headers $headers

    if ($response.status -eq 200) {
        Write-Host "✅ Planner endpoint working!" -ForegroundColor Green
        Write-Host "   Confidence: $($response.data.trade_intent.confidence)" -ForegroundColor Gray
        Write-Host "   Venue: $($response.data.trade_intent.venue)" -ForegroundColor Gray
        Write-Host "   Deep link generated: $([bool]$response.data.execution_plan.deep_link)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Planner endpoint failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Planner test error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "If tests passed, your Vercel sidecar is working!" -ForegroundColor Cyan
Write-Host "Update your InfinityFree configuration with the Vercel URLs." -ForegroundColor Cyan