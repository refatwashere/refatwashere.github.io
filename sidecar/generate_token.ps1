# Secure Token Generator for Sidecar Authentication

param(
    [int]$Length = 32,
    [switch]$GenerateOnly,
    [switch]$SaveToEnv
)

Write-Host "🔐 Secure Token Generator" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Yellow

function Generate-SecureToken {
    param([int]$len = 32)

    # Generate cryptographically secure random bytes
    $bytes = New-Object byte[] $len
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
    $rng.GetBytes($bytes)

    # Convert to base64url (URL-safe base64)
    $base64 = [Convert]::ToBase64String($bytes)

    # Make URL-safe by replacing problematic characters
    $token = $base64.Replace('+', '-').Replace('/', '_').Replace('=', '')

    # Ensure minimum length
    while ($token.Length -lt $len) {
        $extraBytes = New-Object byte[] ($len - $token.Length)
        $rng.GetBytes($extraBytes)
        $extraBase64 = [Convert]::ToBase64String($extraBytes).Replace('+', '-').Replace('/', '_').Replace('=', '')
        $token += $extraBase64
    }

    return $token.Substring(0, $len)
}

# Generate token
$token = Generate-SecureToken -len $Length

Write-Host "Generated secure token:" -ForegroundColor Cyan
Write-Host "$token" -ForegroundColor Green
Write-Host ""
Write-Host "Token length: $($token.Length) characters" -ForegroundColor Gray
Write-Host ""

if ($SaveToEnv) {
    Write-Host "Saving to environment variable..." -ForegroundColor Cyan

    # Save to user environment variable
    [Environment]::SetEnvironmentVariable("PLANNER_SIDECAR_TOKEN", $token, "User")

    Write-Host "✅ Token saved to PLANNER_SIDECAR_TOKEN environment variable" -ForegroundColor Green
    Write-Host "Note: Restart PowerShell/Command Prompt to use the new environment variable" -ForegroundColor Yellow
}

if (-not $GenerateOnly) {
    Write-Host "📋 Copy this token for:" -ForegroundColor Yellow
    Write-Host "   • Railway environment variable: PLANNER_SIDECAR_TOKEN" -ForegroundColor Gray
    Write-Host "   • InfinityFree .htaccess: SetEnv PLANNER_SIDECAR_TOKEN $token" -ForegroundColor Gray
    Write-Host "   • Backend configuration files" -ForegroundColor Gray
    Write-Host ""

    Write-Host "🔒 Security Notes:" -ForegroundColor Red
    Write-Host "   • Keep this token secure and private" -ForegroundColor Gray
    Write-Host "   • Use HTTPS for all API communications" -ForegroundColor Gray
    Write-Host "   • Rotate tokens regularly in production" -ForegroundColor Gray
    Write-Host "   • Never commit tokens to version control" -ForegroundColor Gray
}

# Output just the token for easy copying
Write-Host ""
Write-Host "Token (copy this):" -ForegroundColor Cyan
Write-Host "$token" -ForegroundColor White -BackgroundColor DarkBlue