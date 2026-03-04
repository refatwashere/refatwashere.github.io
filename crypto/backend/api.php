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
        $result = makeRequest($url, 'GET', []);
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

    default:
        errorResponse('Invalid action', 400);
}

$statusCode = (int) ($result['code'] ?? 500);
if ($statusCode >= 400) {
    $upstreamData = is_array($result['data'] ?? null) ? $result['data'] : [];
    $message = mapBinanceErrorMessage($statusCode, $upstreamData);
    $curlErrorNo = (int) ($result['curl_errno'] ?? 0);

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
    errorResponse($message, $statusCode, [
        'upstream_code' => $statusCode,
        'upstream_errno' => $curlErrorNo
    ]);
}

successResponse($result['data'] ?? []);
