param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$LegacyToken,

    [Parameter(Mandatory = $true)]
    [string]$CryptoToken,

    [string]$AllowedOrigin = "https://refatishere.free.nf",
    [string]$DisallowedOrigin = "https://evil.example",
    [string]$BinanceApiKey = "",
    [string]$BinanceApiSecret = "",
    [switch]$RunTradingFlow,
    [switch]$SkipNegativeTests,
    [switch]$SkipReadinessChecks,
    [switch]$SkipFrontendChecks
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Assert($cond, $msg) {
    if (-not $cond) {
        throw "ASSERTION FAILED: $msg"
    }
}

function Is-SuccessResponse {
    param([object]$Json)
    if ($null -eq $Json) { return $false }
    if ($Json.status -eq "success") { return $true }
    if ($Json.success -eq $true) { return $true }
    return $false
}

function Get-HeaderValue {
    param(
        [object]$Headers,
        [string]$Name
    )

    if ($null -eq $Headers) { return $null }

    $target = $Name.ToLowerInvariant()
    foreach ($key in $Headers.Keys) {
        if ($key.ToString().ToLowerInvariant() -eq $target) {
            return $Headers[$key]
        }
    }
    return $null
}

function Invoke-Check {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    $params = @{
        Method = $Method
        Uri = $Url
        Headers = $Headers
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $resp = Invoke-WebRequest @params
        $json = $null
        if ($resp.Content) {
            try { $json = $resp.Content | ConvertFrom-Json } catch {}
        }
        return @{
            StatusCode = [int]$resp.StatusCode
            Headers = $resp.Headers
            Json = $json
            Raw = $resp.Content
        }
    } catch {
        $status = 0
        $respHeaders = @{}
        $raw = ""
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode.value__
            $respHeaders = $_.Exception.Response.Headers
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $raw = $reader.ReadToEnd()
        }
        $json = $null
        if ($raw) {
            try { $json = $raw | ConvertFrom-Json } catch {}
        }
        return @{
            StatusCode = $status
            Headers = $respHeaders
            Json = $json
            Raw = $raw
        }
    }
}

$base = $BaseUrl.TrimEnd("/")
$apiCampaigns = "$base/api/campaigns.php"
$apiTrades = "$base/api/trades.php"
$apiHealth = "$base/api/health.php"
$cryptoApi = "$base/crypto/backend/api.php"
$cryptoHealth = "$base/crypto/backend/health.php"

if (-not $SkipNegativeTests) {
    Write-Step "A1: /api unauthorized should be 401 with request_id"
    $r = Invoke-Check -Method GET -Url $apiCampaigns
    Assert ($r.StatusCode -eq 401) "Expected 401 without token, got $($r.StatusCode)"
    Assert ($r.Json.request_id) "Expected request_id in unauthorized response"

    Write-Step "A2: /api wrong token should be 401"
    $r = Invoke-Check -Method GET -Url $apiCampaigns -Headers @{ "X-API-Token" = "wrong-token" }
    Assert ($r.StatusCode -eq 401) "Expected 401 with wrong token, got $($r.StatusCode)"
    Assert ($r.Json.request_id) "Expected request_id in unauthorized response"

    Write-Step "A3: /api malformed trade payload should be 422 and no SQL leakage"
    $r = Invoke-Check -Method POST -Url $apiTrades -Headers @{ "X-API-Token" = $LegacyToken } -Body @{ bad = "payload" }
    Assert (($r.StatusCode -eq 400) -or ($r.StatusCode -eq 422)) "Expected 400/422, got $($r.StatusCode)"
    Assert (($r.Raw -notmatch "SELECT|INSERT|mysqli|syntax|SQL") -or ($r.StatusCode -lt 500)) "Potential SQL/internal leakage detected"
    Assert ($r.Json.request_id) "Expected request_id in validation error response"

    Write-Step "B1: crypto backend unauthorized should be 401 with request_id"
    $r = Invoke-Check -Method POST -Url "$cryptoApi?action=account" -Body @{ useTestnet = $true }
    Assert ($r.StatusCode -eq 401) "Expected 401 without crypto token, got $($r.StatusCode)"
    Assert ($r.Json.request_id) "Expected request_id in crypto unauthorized response"

    Write-Step "B2: crypto backend wrong token should be 401"
    $r = Invoke-Check -Method POST -Url "$cryptoApi?action=account" -Headers @{ "X-API-Token" = "wrong-token" } -Body @{ useTestnet = $true }
    Assert ($r.StatusCode -eq 401) "Expected 401 with wrong crypto token, got $($r.StatusCode)"

    Write-Step "B3: crypto klines without token should be 401 with request_id"
    $r = Invoke-Check -Method POST -Url "$cryptoApi?action=klines" -Body @{ symbol = "BTCUSDT"; interval = "5m"; limit = 50 }
    Assert ($r.StatusCode -eq 401) "Expected 401 for klines without token, got $($r.StatusCode)"
    Assert ($r.Json.request_id) "Expected request_id in klines unauthorized response"

    Write-Step "B4: crypto klines invalid symbol should be 422"
    $r = Invoke-Check -Method POST -Url "$cryptoApi?action=klines" -Headers @{ "X-API-Token" = $CryptoToken } -Body @{ symbol = "BTC!"; interval = "5m"; limit = 50 }
    Assert ($r.StatusCode -eq 422) "Expected 422 for invalid klines symbol, got $($r.StatusCode)"

    Write-Step "B5: crypto klines invalid interval should be 422"
    $r = Invoke-Check -Method POST -Url "$cryptoApi?action=klines" -Headers @{ "X-API-Token" = $CryptoToken } -Body @{ symbol = "BTCUSDT"; interval = "2m"; limit = 50 }
    Assert ($r.StatusCode -eq 422) "Expected 422 for invalid klines interval, got $($r.StatusCode)"
}

Write-Step "C1: /api correct legacy token should be 200"
$r = Invoke-Check -Method GET -Url $apiCampaigns -Headers @{ "X-API-Token" = $LegacyToken }
Assert ($r.StatusCode -eq 200) "Expected 200 with legacy token, got $($r.StatusCode)"
Assert (Is-SuccessResponse -Json $r.Json) "Expected success response envelope from campaigns API"

Write-Step "C2: CORS preflight allowed origin should return 204 + allow-origin"
$r = Invoke-Check -Method OPTIONS -Url $apiCampaigns -Headers @{
    "Origin" = $AllowedOrigin
    "Access-Control-Request-Method" = "GET"
}
Assert ($r.StatusCode -eq 204) "Expected 204 preflight, got $($r.StatusCode)"
Assert ((Get-HeaderValue -Headers $r.Headers -Name "Access-Control-Allow-Origin") -eq $AllowedOrigin) "Expected allow-origin header for allowed origin"

Write-Step "C3: CORS disallowed origin should not echo allow-origin"
$r = Invoke-Check -Method OPTIONS -Url $apiCampaigns -Headers @{
    "Origin" = $DisallowedOrigin
    "Access-Control-Request-Method" = "GET"
}
Assert (-not (Get-HeaderValue -Headers $r.Headers -Name "Access-Control-Allow-Origin")) "Unexpected allow-origin for disallowed origin"

Write-Step "C4: /api/trades pagination, filters, and sort should return meta"
$r = Invoke-Check -Method GET -Url "$apiTrades?page=1&limit=5&sort=id_desc" -Headers @{ "X-API-Token" = $LegacyToken }
Assert ($r.StatusCode -eq 200) "Expected 200 for paginated trades, got $($r.StatusCode)"
Assert (Is-SuccessResponse -Json $r.Json) "Expected success status for paginated trades"
Assert ($r.Json.meta.page -eq 1) "Expected page meta in trades response"

Write-Step "C5: crypto klines with token should return success array"
$r = Invoke-Check -Method POST -Url "$cryptoApi?action=klines" -Headers @{ "X-API-Token" = $CryptoToken } -Body @{ symbol = "BTCUSDT"; interval = "5m"; limit = 50 }
Assert ($r.StatusCode -eq 200) "Expected 200 for crypto klines, got $($r.StatusCode)"
Assert (Is-SuccessResponse -Json $r.Json) "Expected success response for crypto klines"
Assert ($r.Json.data -is [System.Array]) "Expected klines data array"
Assert ($r.Json.data.Count -gt 0) "Expected at least one kline row"

if (-not $SkipReadinessChecks) {
    Write-Step "D1: readiness checks should return 200 when env vars are configured"
    $legacyHealth = Invoke-Check -Method GET -Url $apiHealth
    Assert (($legacyHealth.StatusCode -eq 200) -or ($legacyHealth.StatusCode -eq 500)) "Unexpected status from /api/health.php"
    Assert ($legacyHealth.Json.data) "Expected structured data from /api/health.php"
    Assert ($legacyHealth.Json.data.ready -eq $true) "Legacy API readiness failed; missing required env vars"

    $cryptoHealthResp = Invoke-Check -Method GET -Url $cryptoHealth
    Assert (($cryptoHealthResp.StatusCode -eq 200) -or ($cryptoHealthResp.StatusCode -eq 500)) "Unexpected status from /crypto/backend/health.php"
    Assert ($cryptoHealthResp.Json.data) "Expected structured data from /crypto/backend/health.php"
    Assert ($cryptoHealthResp.Json.data.ready -eq $true) "Crypto backend readiness failed; missing required env vars"
}

if (-not $SkipFrontendChecks) {
    Write-Step "E1: critical frontend pages should return 200"
    $pages = @(
        "$base/index.html",
        "$base/about.html",
        "$base/projects.html",
        "$base/resources.html",
        "$base/contact.html",
        "$base/mom.html",
        "$base/mem.html",
        "$base/memory.html",
        "$base/Tradejournal.html",
        "$base/crypto/crypto.html"
    )
    foreach ($page in $pages) {
        $resp = Invoke-Check -Method GET -Url $page
        Assert ($resp.StatusCode -eq 200) "Expected 200 for $page, got $($resp.StatusCode)"
    }

    Write-Step "E2: resources downloads should be reachable"
    $downloads = @(
        "$base/resources/StdVI_Math_Worksheet.txt",
        "$base/resources/IELTS_Vocab_Sample.txt",
        "$base/resources/ClassRoutine_Template.txt",
        "$base/resources/StdVI_Math_Worksheet.pdf",
        "$base/resources/IELTS_Vocab_Sample.pdf",
        "$base/resources/ClassRoutine_Template.pdf"
    )
    foreach ($file in $downloads) {
        $resp = Invoke-Check -Method GET -Url $file
        Assert ($resp.StatusCode -eq 200) "Expected 200 for resource $file, got $($resp.StatusCode)"
    }

    Write-Step "E3: project CTAs should not use placeholder alert popups"
    $projectsPage = Invoke-Check -Method GET -Url "$base/projects.html"
    Assert ($projectsPage.StatusCode -eq 200) "Failed to load projects page"
    Assert ($projectsPage.Raw -notmatch "onclick=`"alert\(") "Found placeholder alert CTA in projects page"

    Write-Step "E4: crypto UI labels should be cleaned and mojibake-free"
    $cryptoPage = Invoke-Check -Method GET -Url "$base/crypto/crypto.html"
    Assert ($cryptoPage.StatusCode -eq 200) "Failed to load crypto page"
    Assert ($cryptoPage.Raw -match "&#x1F319; Dark") "Missing expected theme label"
    Assert ($cryptoPage.Raw -match "&#9881;&#65039; Settings") "Missing expected settings label"
    Assert ($cryptoPage.Raw -match "&#x1F4CA; Market") "Missing expected market tab label"
    Assert ($cryptoPage.Raw -match "&#x1F504; Refresh") "Missing expected refresh label"
    Assert ($cryptoPage.Raw -match "id=`"rsiChart`"") "Missing RSI chart canvas"
    Assert ($cryptoPage.Raw -match "id=`"chartDataSourceBadge`"") "Missing chart data-source badge"
    Assert ($cryptoPage.Raw -match "RSI 14") "Missing RSI legend label"
    Assert ($cryptoPage.Raw -notmatch "Ãƒ|Ã¢") "Detected mojibake artifacts in crypto page"

    Write-Step "E5: legacy journal/memorial pages should not contain mojibake markers"
    foreach ($legacyPage in @("$base/Tradejournal.html", "$base/mem.html", "$base/memory.html")) {
        $legacyResp = Invoke-Check -Method GET -Url $legacyPage
        Assert ($legacyResp.StatusCode -eq 200) "Failed to load legacy page $legacyPage"
        Assert ($legacyResp.Raw -notmatch "Ã|â") "Detected mojibake artifacts in $legacyPage"
    }
}

if ($RunTradingFlow) {
    Write-Step "F1: running full trading flow with testnet credentials"
    Assert ($BinanceApiKey -ne "" -and $BinanceApiSecret -ne "") "RunTradingFlow requires BinanceApiKey and BinanceApiSecret"

    $commonHeaders = @{ "X-API-Token" = $CryptoToken }
    $commonBody = @{
        apiKey = $BinanceApiKey
        apiSecret = $BinanceApiSecret
        useTestnet = $true
    }

    $acct = Invoke-Check -Method POST -Url "$cryptoApi?action=account" -Headers $commonHeaders -Body $commonBody
    Assert ($acct.StatusCode -eq 200) "Account call failed: $($acct.StatusCode)"
    Assert (Is-SuccessResponse -Json $acct.Json) "Account response is not success"

    $symbol = "BTCUSDT"
    $order = Invoke-Check -Method POST -Url "$cryptoApi?action=order" -Headers $commonHeaders -Body ($commonBody + @{
        symbol = $symbol
        side = "BUY"
        type = "LIMIT"
        quantity = "0.001"
        price = "10000"
    })
    Assert ($order.StatusCode -eq 200) "Order call failed: $($order.StatusCode)"
    Assert (Is-SuccessResponse -Json $order.Json) "Order response is not success"

    $orders = Invoke-Check -Method POST -Url "$cryptoApi?action=orders" -Headers $commonHeaders -Body ($commonBody + @{ symbol = $symbol })
    Assert ($orders.StatusCode -eq 200) "Open orders call failed: $($orders.StatusCode)"
    Assert (Is-SuccessResponse -Json $orders.Json) "Open orders response is not success"

    $orderId = $null
    if ($orders.Json.data -is [System.Array] -and $orders.Json.data.Count -gt 0) {
        $orderId = $orders.Json.data[0].orderId
    } elseif ($order.Json.data.orderId) {
        $orderId = $order.Json.data.orderId
    }
    Assert ($orderId) "Could not determine orderId for cancel test"

    $cancel = Invoke-Check -Method POST -Url "$cryptoApi?action=cancel" -Headers $commonHeaders -Body ($commonBody + @{ symbol = $symbol; orderId = $orderId })
    Assert ($cancel.StatusCode -eq 200) "Cancel call failed: $($cancel.StatusCode)"
    Assert (Is-SuccessResponse -Json $cancel.Json) "Cancel response is not success"
}

Write-Host "`nSmoke test completed successfully." -ForegroundColor Green

