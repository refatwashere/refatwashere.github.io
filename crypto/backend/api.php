<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

initRequestContext('crypto-backend');
setCorsHeaders(['POST', 'OPTIONS']);
handleCorsPreflight();
requireMethod(['POST']);
requireApiToken();

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    errorResponse('Invalid JSON payload', 400);
}

$action = (string) ($_GET['action'] ?? '');
if ($action === '') {
    errorResponse('Invalid action', 400);
}

$apiKey = trim((string) ($input['apiKey'] ?? ''));
$apiSecret = trim((string) ($input['apiSecret'] ?? ''));
$useTestnet = (bool) ($input['useTestnet'] ?? true);

function parseRecvWindow($value): int
{
    if ($value === null || $value === '') {
        return 5000;
    }
    if (is_string($value)) {
        $value = trim($value);
    }
    if (!is_numeric($value)) {
        errorResponse('Invalid recvWindow', 422);
    }
    $recvWindow = (int) round((float) $value);
    if ($recvWindow < 1 || $recvWindow > 60000) {
        errorResponse('Invalid recvWindow', 422, ['allowed_range' => '1..60000']);
    }
    return $recvWindow;
}

function buildSignedQuery(array $params): string
{
    return http_build_query($params, '', '&', PHP_QUERY_RFC3986);
}

function validateClientOrderId(string $clientOrderId): void
{
    if ($clientOrderId === '') {
        return;
    }
    if (preg_match('/^[A-Za-z0-9._-]{1,36}$/', $clientOrderId) !== 1) {
        errorResponse('Invalid newClientOrderId format', 422);
    }
}

function buildPlannerDeepLink(string $symbol): string
{
    if (preg_match('/^([A-Z0-9]{2,20})USDT$/', $symbol, $m) === 1) {
        return 'https://www.binance.com/en/trade/' . rawurlencode($m[1] . '_USDT') . '?type=spot';
    }
    return 'https://www.binance.com/en/trade';
}

function buildLocalPlannerResult(array $plannerInput): array
{
    $symbol = strtoupper(trim((string) ($plannerInput['symbol'] ?? '')));
    $side = strtoupper(trim((string) ($plannerInput['side'] ?? '')));
    $size = (float) ($plannerInput['size'] ?? 0);
    $type = strtoupper(trim((string) ($plannerInput['type'] ?? 'MARKET')));
    $marketPrice = isset($plannerInput['marketPrice']) && is_numeric($plannerInput['marketPrice'])
        ? (float) $plannerInput['marketPrice']
        : null;
    $limitPrice = isset($plannerInput['limitPrice']) && is_numeric($plannerInput['limitPrice'])
        ? (float) $plannerInput['limitPrice']
        : null;
    $effectivePrice = $marketPrice ?? $limitPrice;

    $riskFlags = [];
    if ($size > 5) {
        $riskFlags[] = 'size_large';
    }
    if ($effectivePrice !== null && ($size * $effectivePrice) > 5000) {
        $riskFlags[] = 'notional_high';
    }
    if ($type === 'MARKET') {
        $riskFlags[] = 'market_order_slippage';
    }
    if ($marketPrice === null && $limitPrice === null) {
        $riskFlags[] = 'price_reference_missing';
    }

    $confidence = 0.62;
    if ($marketPrice === null) {
        $confidence -= 0.12;
    }
    if (in_array('size_large', $riskFlags, true)) {
        $confidence -= 0.08;
    }
    if (in_array('notional_high', $riskFlags, true)) {
        $confidence -= 0.05;
    }
    $confidence = max(0.05, min(0.95, $confidence));

    $rationaleBits = [];
    $rationaleBits[] = $side === 'BUY'
        ? 'Entry intent is long-biased.'
        : 'Entry intent is short/exit-biased.';
    if ($effectivePrice !== null) {
        $rationaleBits[] = 'Price reference is available for pre-trade sizing checks.';
    } else {
        $rationaleBits[] = 'No trusted price reference was supplied.';
    }
    if (count($riskFlags) > 0) {
        $rationaleBits[] = 'Risk checks flagged: ' . implode(', ', $riskFlags) . '.';
    } else {
        $rationaleBits[] = 'No elevated heuristic risk flags.';
    }

    return [
        'trade_intent' => [
            'symbol' => $symbol,
            'side' => $side,
            'size' => $size,
            'confidence' => round($confidence, 2),
            'rationale' => implode(' ', $rationaleBits),
            'risk_flags' => $riskFlags
        ],
        'risk_assessment' => [
            'score' => round((1 - $confidence) * 100),
            'level' => $confidence >= 0.7 ? 'low' : ($confidence >= 0.5 ? 'medium' : 'high'),
            'flags' => $riskFlags
        ],
        'execution_plan' => [
            'mode' => 'assisted',
            'steps' => [
                'Review symbol, side, and size against your strategy.',
                'Confirm risk flags and set stop-loss/take-profit levels.',
                'Place order manually after verification.',
                'Re-check fill status and adjust risk management.'
            ],
            'deep_link' => buildPlannerDeepLink($symbol)
        ],
        'meta' => [
            'source' => 'local_heuristic',
            'planner_version' => '1.0.0'
        ]
    ];
}

$CACHE_SYMBOLS = ['BTCUSDT', 'BNBUSDT', 'ETHUSDT', 'DOGEUSDT'];

function isCacheEligibleSymbol(string $symbol): bool
{
    global $CACHE_SYMBOLS;
    return in_array($symbol, $CACHE_SYMBOLS, true);
}

function getCacheDbConnection(): ?mysqli
{
    $host = getEnvValue('DB_HOST');
    $user = getEnvValue('DB_USER');
    $pass = getEnvValue('DB_PASS');
    $name = getEnvValue('DB_NAME');
    if (!$host || !$user || $pass === null || !$name) {
        return null;
    }

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli($host, $user, $pass, $name);
    if ($conn->connect_error) {
        logErrorEvent('cache_db_connect_error', 'Failed to connect cache DB', ['error' => $conn->connect_error]);
        return null;
    }
    return $conn;
}

function ensureKlinesCacheTable(mysqli $conn): bool
{
    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS crypto_market_cache (
  symbol VARCHAR(20) NOT NULL,
  interval_name VARCHAR(10) NOT NULL,
  limit_count INT NOT NULL,
  payload LONGTEXT NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (symbol, interval_name, limit_count),
  KEY idx_cache_expires_at (expires_at)
)
SQL;
    if (!$conn->query($sql)) {
        logErrorEvent('cache_table_error', 'Failed to ensure crypto_market_cache table', ['error' => $conn->error]);
        return false;
    }
    return true;
}

function pruneExpiredKlinesCache(mysqli $conn): void
{
    if (random_int(1, 10) !== 1) {
        return;
    }
    $conn->query("DELETE FROM crypto_market_cache WHERE expires_at < UTC_TIMESTAMP()");
}

function readKlinesCache(mysqli $conn, string $symbol, string $interval, int $limit): ?array
{
    $stmt = $conn->prepare(
        "SELECT payload FROM crypto_market_cache WHERE symbol = ? AND interval_name = ? AND limit_count = ? AND expires_at >= UTC_TIMESTAMP() LIMIT 1"
    );
    if ($stmt === false) {
        return null;
    }
    $stmt->bind_param('ssi', $symbol, $interval, $limit);
    if (!$stmt->execute()) {
        $stmt->close();
        return null;
    }
    $result = $stmt->get_result();
    if ($result === false) {
        $stmt->close();
        return null;
    }
    $row = $result->fetch_assoc();
    $stmt->close();
    if (!is_array($row) || !isset($row['payload'])) {
        return null;
    }
    $decoded = json_decode((string) $row['payload'], true);
    return is_array($decoded) ? $decoded : null;
}

function writeKlinesCache(mysqli $conn, string $symbol, string $interval, int $limit, array $payload): void
{
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return;
    }

    $stmt = $conn->prepare(
        "INSERT INTO crypto_market_cache (symbol, interval_name, limit_count, payload, fetched_at, expires_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR))
         ON DUPLICATE KEY UPDATE payload = VALUES(payload), fetched_at = UTC_TIMESTAMP(), expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)"
    );
    if ($stmt === false) {
        return;
    }
    $stmt->bind_param('ssis', $symbol, $interval, $limit, $json);
    $stmt->execute();
    $stmt->close();
}

$klinesContext = null;

switch ($action) {
    case 'klines':
        $symbol = strtoupper(trim((string) ($input['symbol'] ?? '')));
        $interval = trim((string) ($input['interval'] ?? ''));
        $limit = (int) ($input['limit'] ?? 100);
        $allowedIntervals = ['1m', '5m', '10m', '15m', '30m', '1h', '4h', '1d'];

        if ($symbol === '' || preg_match('/^[A-Z0-9]{5,20}$/', $symbol) !== 1) {
            errorResponse('Invalid symbol format', 422);
        }
        if (!in_array($interval, $allowedIntervals, true)) {
            errorResponse('Invalid interval', 422, ['allowed_intervals' => $allowedIntervals]);
        }

        if ($limit < 20) {
            $limit = 20;
        } elseif ($limit > 500) {
            $limit = 500;
        }

        $queryString = sprintf(
            'symbol=%s&interval=%s&limit=%d',
            rawurlencode($symbol),
            rawurlencode($interval),
            $limit
        );
        $url = "https://api.binance.com/api/v3/klines?$queryString";
        $result = makeRequest(
            $url,
            'GET',
            [],
            null,
            [
                'maxAttempts' => 1,
                'connectTimeout' => 4,
                'timeout' => 6
            ]
        );
        $klinesContext = [
            'symbol' => $symbol,
            'interval' => $interval,
            'limit' => $limit
        ];
        break;

    case 'account':
        if ($apiKey === '' || $apiSecret === '') {
            errorResponse('Missing Binance API credentials', 422);
        }
        $baseURL = $useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        $recvWindow = parseRecvWindow($input['recvWindow'] ?? null);
        $timestamp = round(microtime(true) * 1000);
        $queryString = buildSignedQuery([
            'timestamp' => $timestamp,
            'recvWindow' => $recvWindow
        ]);
        $signature = signRequest($queryString, $apiSecret);
        $url = "$baseURL/api/v3/account?$queryString&signature=$signature";
        $result = makeRequest($url, 'GET', ["X-MBX-APIKEY: $apiKey"]);
        break;

    case 'order':
        if ($apiKey === '' || $apiSecret === '') {
            errorResponse('Missing Binance API credentials', 422);
        }
        $baseURL = $useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        $symbol = strtoupper(trim((string) ($input['symbol'] ?? '')));
        $side = strtoupper(trim((string) ($input['side'] ?? '')));
        $type = strtoupper(trim((string) ($input['type'] ?? '')));
        $quantity = (string) ($input['quantity'] ?? '');
        $price = isset($input['price']) ? (string) $input['price'] : null;
        $recvWindow = parseRecvWindow($input['recvWindow'] ?? null);
        $newClientOrderId = trim((string) ($input['newClientOrderId'] ?? buildClientOrderId($symbol)));
        validateClientOrderId($newClientOrderId);
        $input['newClientOrderId'] = $newClientOrderId;

        if ($symbol === '' || !in_array($side, ['BUY', 'SELL'], true) || $type === '' || $quantity === '') {
            errorResponse('Invalid order payload', 422);
        }
        if (!is_numeric($quantity) || (float) $quantity <= 0) {
            errorResponse('Invalid quantity', 422);
        }
        if ((bool) ($input['simulateUnknown'] ?? false) === true) {
            errorResponse(
                'Order status unknown, verify using order-status with clientOrderId.',
                504,
                [
                    'data' => [
                        'clientOrderId' => $newClientOrderId,
                        'recoverable' => true
                    ],
                    'upstream_code' => 504,
                    'upstream_errno' => 0
                ]
            );
        }

        $timestamp = round(microtime(true) * 1000);
        $params = [
            'symbol' => $symbol,
            'side' => $side,
            'type' => $type,
            'quantity' => $quantity,
            'newClientOrderId' => $newClientOrderId,
            'recvWindow' => $recvWindow,
            'timestamp' => $timestamp
        ];

        if ($type === 'LIMIT') {
            if ($price === null || $price === '') {
                errorResponse('Limit orders require price', 422);
            }
            if (!is_numeric($price) || (float) $price <= 0) {
                errorResponse('Invalid price', 422);
            }
            $params['price'] = $price;
            $params['timeInForce'] = 'GTC';
        }

        $queryString = buildSignedQuery($params);
        $signature = signRequest($queryString, $apiSecret);
        $url = "$baseURL/api/v3/order?$queryString&signature=$signature";
        $result = makeRequest($url, 'POST', ["X-MBX-APIKEY: $apiKey"]);
        break;

    case 'orders':
        if ($apiKey === '' || $apiSecret === '') {
            errorResponse('Missing Binance API credentials', 422);
        }
        $baseURL = $useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        $symbol = isset($input['symbol']) ? strtoupper(trim((string) $input['symbol'])) : null;
        $recvWindow = parseRecvWindow($input['recvWindow'] ?? null);
        $timestamp = round(microtime(true) * 1000);
        $params = [
            'recvWindow' => $recvWindow,
            'timestamp' => $timestamp
        ];
        if ($symbol !== null && $symbol !== '') {
            $params['symbol'] = $symbol;
        }
        $queryString = buildSignedQuery($params);
        $signature = signRequest($queryString, $apiSecret);
        $url = "$baseURL/api/v3/openOrders?$queryString&signature=$signature";
        $result = makeRequest($url, 'GET', ["X-MBX-APIKEY: $apiKey"]);
        break;

    case 'cancel':
        if ($apiKey === '' || $apiSecret === '') {
            errorResponse('Missing Binance API credentials', 422);
        }
        $baseURL = $useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        $symbol = strtoupper(trim((string) ($input['symbol'] ?? '')));
        $orderId = (string) ($input['orderId'] ?? '');
        $recvWindow = parseRecvWindow($input['recvWindow'] ?? null);
        if ($symbol === '' || $orderId === '') {
            errorResponse('Missing cancel payload', 422);
        }
        if (!ctype_digit($orderId)) {
            errorResponse('Invalid orderId', 422);
        }

        $timestamp = round(microtime(true) * 1000);
        $queryString = buildSignedQuery([
            'symbol' => $symbol,
            'orderId' => $orderId,
            'recvWindow' => $recvWindow,
            'timestamp' => $timestamp
        ]);
        $signature = signRequest($queryString, $apiSecret);
        $url = "$baseURL/api/v3/order?$queryString&signature=$signature";
        $result = makeRequest($url, 'DELETE', ["X-MBX-APIKEY: $apiKey"]);
        break;

    case 'order-status':
        if ($apiKey === '' || $apiSecret === '') {
            errorResponse('Missing Binance API credentials', 422);
        }
        $baseURL = $useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
        $symbol = strtoupper(trim((string) ($input['symbol'] ?? '')));
        $orderId = trim((string) ($input['orderId'] ?? ''));
        $origClientOrderId = trim((string) ($input['origClientOrderId'] ?? ''));
        $recvWindow = parseRecvWindow($input['recvWindow'] ?? null);

        if ($symbol === '') {
            errorResponse('symbol is required', 422);
        }
        if ($orderId === '' && $origClientOrderId === '') {
            errorResponse('Provide orderId or origClientOrderId', 422);
        }
        if ($orderId !== '' && !ctype_digit($orderId)) {
            errorResponse('Invalid orderId', 422);
        }
        if ($origClientOrderId !== '') {
            validateClientOrderId($origClientOrderId);
        }

        $timestamp = round(microtime(true) * 1000);
        $params = [
            'symbol' => $symbol,
            'recvWindow' => $recvWindow,
            'timestamp' => $timestamp
        ];
        if ($orderId !== '') {
            $params['orderId'] = $orderId;
        } else {
            $params['origClientOrderId'] = $origClientOrderId;
        }

        $queryString = buildSignedQuery($params);
        $signature = signRequest($queryString, $apiSecret);
        $url = "$baseURL/api/v3/order?$queryString&signature=$signature";
        $result = makeRequest($url, 'GET', ["X-MBX-APIKEY: $apiKey"]);
        break;

    case 'planner-intent':
        $symbol = strtoupper(trim((string) ($input['symbol'] ?? '')));
        $side = strtoupper(trim((string) ($input['side'] ?? '')));
        $size = $input['size'] ?? null;
        $type = strtoupper(trim((string) ($input['type'] ?? 'MARKET')));
        $provider = strtolower(trim((string) ($input['provider'] ?? 'local')));
        $allowedTypes = ['MARKET', 'LIMIT'];

        if ($symbol === '' || preg_match('/^[A-Z0-9]{5,20}$/', $symbol) !== 1) {
            errorResponse('Invalid symbol format', 422);
        }
        if (!in_array($side, ['BUY', 'SELL'], true)) {
            errorResponse('Invalid side', 422, ['allowed_values' => ['BUY', 'SELL']]);
        }
        if (!is_numeric($size) || (float) $size <= 0 || (float) $size > 100000000) {
            errorResponse('Invalid size', 422);
        }
        if (!in_array($type, $allowedTypes, true)) {
            errorResponse('Invalid type', 422, ['allowed_values' => $allowedTypes]);
        }
        if ($provider !== 'local' && $provider !== 'sidecar') {
            errorResponse('Invalid provider', 422, ['allowed_values' => ['local', 'sidecar']]);
        }

        if ($provider === 'sidecar') {
            $sidecarUrl = trim((string) getEnvValue('PLANNER_SIDECAR_URL', ''));
            if ($sidecarUrl === '') {
                errorResponse('Planner sidecar unavailable', 503, ['source' => 'planner_sidecar']);
            }

            $sidecarPayload = [
                'symbol' => $symbol,
                'side' => $side,
                'size' => (float) $size,
                'type' => $type,
                'limitPrice' => $input['limitPrice'] ?? null,
                'marketPrice' => $input['marketPrice'] ?? null,
                'mode' => $input['mode'] ?? 'spot'
            ];
            $sidecarResult = makeRequest(
                $sidecarUrl,
                'POST',
                ['Content-Type: application/json', 'X-Request-Id: ' . getRequestId()],
                json_encode($sidecarPayload, JSON_UNESCAPED_SLASHES),
                ['maxAttempts' => 1, 'connectTimeout' => 3, 'timeout' => 5]
            );

            $sidecarStatus = (int) ($sidecarResult['code'] ?? 500);
            $sidecarBody = is_array($sidecarResult['data'] ?? null) ? $sidecarResult['data'] : [];
            if ($sidecarStatus >= 400) {
                errorResponse(
                    'Planner sidecar unavailable',
                    502,
                    [
                        'source' => 'planner_sidecar',
                        'upstream_code' => $sidecarStatus,
                        'upstream_errno' => (int) ($sidecarResult['curl_errno'] ?? 0)
                    ]
                );
            }

            if (isset($sidecarBody['data']) && is_array($sidecarBody['data'])) {
                $sidecarBody = $sidecarBody['data'];
            }
            if (!isset($sidecarBody['trade_intent']) || !is_array($sidecarBody['trade_intent'])) {
                errorResponse('Planner sidecar response invalid', 502, ['source' => 'planner_sidecar']);
            }
            if (!isset($sidecarBody['meta']) || !is_array($sidecarBody['meta'])) {
                $sidecarBody['meta'] = [];
            }
            $sidecarBody['meta']['source'] = 'sidecar';
            successResponse($sidecarBody);
        }

        successResponse(buildLocalPlannerResult($input));
        break;

    default:
        errorResponse('Invalid action', 400);
}

$statusCode = (int) ($result['code'] ?? 500);
if ($statusCode >= 400) {
    $upstreamData = is_array($result['data'] ?? null) ? $result['data'] : [];
    $message = mapBinanceErrorMessage($statusCode, $upstreamData);
    $curlErrorNo = (int) ($result['curl_errno'] ?? 0);

    if ($action === 'klines' && is_array($klinesContext)) {
        $symbol = (string) ($klinesContext['symbol'] ?? '');
        $interval = (string) ($klinesContext['interval'] ?? '');
        $limit = (int) ($klinesContext['limit'] ?? 100);
        if ($symbol !== '' && $interval !== '' && $limit > 0 && isCacheEligibleSymbol($symbol)) {
            $cacheConn = getCacheDbConnection();
            if ($cacheConn !== null && ensureKlinesCacheTable($cacheConn)) {
                pruneExpiredKlinesCache($cacheConn);
                $cached = readKlinesCache($cacheConn, $symbol, $interval, $limit);
                $cacheConn->close();
                if (is_array($cached) && count($cached) > 0) {
                    header('X-Klines-Source: backup-db');
                    successResponse($cached);
                }
            }
        }
    }

    if (
        $action === 'order'
        && isExecutionStatusUnknown($statusCode, $curlErrorNo, $upstreamData)
    ) {
        $recoverClientOrderId = trim((string) ($input['newClientOrderId'] ?? ''));
        if ($recoverClientOrderId === '') {
            $recoverClientOrderId = buildClientOrderId((string) ($input['symbol'] ?? 'ORD'));
        }
        errorResponse(
            'Order status unknown, verify using order-status with clientOrderId.',
            504,
            [
                'data' => [
                    'clientOrderId' => $recoverClientOrderId,
                    'recoverable' => true
                ],
                'upstream_code' => $statusCode,
                'upstream_errno' => $curlErrorNo
            ]
        );
    }

    logErrorEvent('upstream_error', $message, ['status_code' => $statusCode]);
    $extra = [
        'upstream_code' => $statusCode,
        'upstream_errno' => $curlErrorNo
    ];
    if ($action === 'klines') {
        $extra['source'] = 'binance_klines';
    }
    errorResponse($message, $statusCode, $extra);
}

$payload = $result['data'] ?? [];
if ($action === 'klines' && is_array($payload) && is_array($klinesContext)) {
    $symbol = (string) ($klinesContext['symbol'] ?? '');
    $interval = (string) ($klinesContext['interval'] ?? '');
    $limit = (int) ($klinesContext['limit'] ?? 100);
    if ($symbol !== '' && $interval !== '' && $limit > 0 && isCacheEligibleSymbol($symbol)) {
        $cacheConn = getCacheDbConnection();
        if ($cacheConn !== null && ensureKlinesCacheTable($cacheConn)) {
            pruneExpiredKlinesCache($cacheConn);
            writeKlinesCache($cacheConn, $symbol, $interval, $limit, $payload);
            $cacheConn->close();
        }
    }
}

successResponse($payload);
