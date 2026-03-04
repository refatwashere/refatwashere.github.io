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
        $timestamp = round(microtime(true) * 1000);
        $queryString = "timestamp=$timestamp";
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

        if ($symbol === '' || !in_array($side, ['BUY', 'SELL'], true) || $type === '' || $quantity === '') {
            errorResponse('Invalid order payload', 422);
        }

        $timestamp = round(microtime(true) * 1000);
        $queryString = "symbol=$symbol&side=$side&type=$type&quantity=$quantity&timestamp=$timestamp";

        if ($type === 'LIMIT') {
            if ($price === null || $price === '') {
                errorResponse('Limit orders require price', 422);
            }
            $queryString .= "&price=$price&timeInForce=GTC";
        }

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
        $timestamp = round(microtime(true) * 1000);
        $queryString = $symbol ? "symbol=$symbol&timestamp=$timestamp" : "timestamp=$timestamp";
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
        if ($symbol === '' || $orderId === '') {
            errorResponse('Missing cancel payload', 422);
        }

        $timestamp = round(microtime(true) * 1000);
        $queryString = "symbol=$symbol&orderId=$orderId&timestamp=$timestamp";
        $signature = signRequest($queryString, $apiSecret);
        $url = "$baseURL/api/v3/order?$queryString&signature=$signature";
        $result = makeRequest($url, 'DELETE', ["X-MBX-APIKEY: $apiKey"]);
        break;

    default:
        errorResponse('Invalid action', 400);
}

$statusCode = (int) ($result['code'] ?? 500);
if ($statusCode >= 400) {
    $upstreamData = is_array($result['data'] ?? null) ? $result['data'] : [];
    $message = mapBinanceErrorMessage($statusCode, $upstreamData);
    logErrorEvent('upstream_error', $message, ['status_code' => $statusCode]);
    errorResponse($message, $statusCode, ['upstream_code' => $statusCode]);
}

successResponse($result['data'] ?? []);
