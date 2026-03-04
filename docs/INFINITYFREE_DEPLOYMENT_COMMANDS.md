# InfinityFree Deployment Command Checklist

Last updated: 2026-03-04

Target: `https://refatishere.free.nf`

Use this as a command-first companion to `docs/INFINITYFREE_DEPLOYMENT.md`.

## 1) Set local working folder

```powershell
Set-Location "D:\NewProjects\refatishere.free.nf"
```

## 2) Define deployment values (edit once)

```powershell
$BaseUrl = "https://refatishere.free.nf"
$AllowedOrigin = "https://refatishere.free.nf"

$LegacyToken = "REPLACE_WITH_STRONG_LEGACY_TOKEN"
$CryptoToken = "REPLACE_WITH_STRONG_CRYPTO_TOKEN"

$DbHost = "REPLACE_DB_HOST"
$DbUser = "REPLACE_DB_USER"
$DbPass = "REPLACE_DB_PASS"
$DbName = "REPLACE_DB_NAME"
```

## 3) Generate deploy-ready `.htaccess` files locally

```powershell
New-Item -ItemType Directory -Force -Path ".\deploy\infinityfree\generated" | Out-Null

(Get-Content ".\deploy\infinityfree\root.htaccess.example" -Raw) `
  .Replace("REPLACE_WITH_STRONG_LEGACY_TOKEN", $LegacyToken) `
  .Replace("REPLACE_WITH_STRONG_CRYPTO_TOKEN", $CryptoToken) `
  .Replace("https://refatishere.free.nf", $AllowedOrigin) `
  | Set-Content ".\deploy\infinityfree\generated\root.htaccess" -Encoding UTF8

(Get-Content ".\deploy\infinityfree\api.htaccess.example" -Raw) `
  .Replace("REPLACE_DB_HOST", $DbHost) `
  .Replace("REPLACE_DB_USER", $DbUser) `
  .Replace("REPLACE_DB_PASS", $DbPass) `
  .Replace("REPLACE_DB_NAME", $DbName) `
  .Replace("REPLACE_WITH_STRONG_LEGACY_TOKEN", $LegacyToken) `
  .Replace("https://refatishere.free.nf", $AllowedOrigin) `
  | Set-Content ".\deploy\infinityfree\generated\api.htaccess" -Encoding UTF8

(Get-Content ".\deploy\infinityfree\crypto-backend.htaccess.example" -Raw) `
  .Replace("REPLACE_DB_HOST", $DbHost) `
  .Replace("REPLACE_DB_USER", $DbUser) `
  .Replace("REPLACE_DB_PASS", $DbPass) `
  .Replace("REPLACE_DB_NAME", $DbName) `
  .Replace("REPLACE_WITH_STRONG_CRYPTO_TOKEN", $CryptoToken) `
  .Replace("https://refatishere.free.nf", $AllowedOrigin) `
  | Set-Content ".\deploy\infinityfree\generated\crypto-backend.htaccess" -Encoding UTF8
```

## 4) Build upload bundle (zip)

```powershell
$ZipName = "infinityfree-deploy-$(Get-Date -Format yyyyMMdd-HHmmss).zip"
$Items = @(
  "index.html","about.html","projects.html","resources.html","contact.html",
  "Tradejournal.html","mom.html","mem.html","memory.html",
  "style.css","script.js",
  "api","crypto","images","resources","docs"
)
Compress-Archive -Path $Items -DestinationPath ".\$ZipName" -Force
Write-Host "Created $ZipName"
```

## 5) InfinityFree panel actions (manual)

1. Open InfinityFree File Manager for `refatishere.free.nf`.
2. Go to `htdocs/`.
3. Upload and extract the zip from step 4.
4. Upload generated files from `deploy/infinityfree/generated`:
   - `root.htaccess` -> `htdocs/.htaccess`
   - `api.htaccess` -> `htdocs/api/.htaccess`
   - `crypto-backend.htaccess` -> `htdocs/crypto/backend/.htaccess`
5. In phpMyAdmin, run:
   - `deploy/infinityfree/schema.sql`

## 6) Quick readiness checks

```powershell
Invoke-WebRequest "$BaseUrl/api/health.php" -UseBasicParsing | Select-Object -ExpandProperty Content
Invoke-WebRequest "$BaseUrl/crypto/backend/health.php" -UseBasicParsing | Select-Object -ExpandProperty Content
```

## 7) Full smoke test

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1 `
  -BaseUrl $BaseUrl `
  -LegacyToken $LegacyToken `
  -CryptoToken $CryptoToken `
  -AllowedOrigin $AllowedOrigin
```

## 8) Manual browser verification

```text
https://refatishere.free.nf/
https://refatishere.free.nf/crypto/crypto.html
https://refatishere.free.nf/mem.html
https://refatishere.free.nf/memory.html
```

Expected:
- Core pages load without console errors.
- `mem.html` and `memory.html` redirect to `mom.html`.
- Crypto chart loads and backend endpoints pass auth/readiness checks.
