<?php
declare(strict_types=1);

function initRequestContext(string $service = 'crypto-backend'): void
{
    static $initialized = false;
    if ($initialized) {
        return;
    }
    $initialized = true;

    $incomingRequestId = (string) ($_SERVER['HTTP_X_REQUEST_ID'] ?? '');
    $requestId = preg_match('/^[a-zA-Z0-9\-_]{8,64}$/', $incomingRequestId) === 1
        ? $incomingRequestId
        : bin2hex(random_bytes(8));

    $GLOBALS['REQUEST_ID'] = $requestId;
    $GLOBALS['REQUEST_START_MS'] = (int) round(microtime(true) * 1000);
    $GLOBALS['REQUEST_SERVICE'] = $service;

    header('X-Request-Id: ' . $requestId);
    header('Content-Type: application/json');

    register_shutdown_function(static function (): void {
        $startMs = (int) ($GLOBALS['REQUEST_START_MS'] ?? (int) round(microtime(true) * 1000));
        $durationMs = (int) max(0, round(microtime(true) * 1000) - $startMs);
        $statusCode = http_response_code();
        if ($statusCode <= 0) {
            $statusCode = 500;
        }

        error_log(json_encode([
            'service' => (string) ($GLOBALS['REQUEST_SERVICE'] ?? 'crypto-backend'),
            'event' => 'request_complete',
            'request_id' => getRequestId(),
            'method' => (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            'path' => (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH),
            'status_code' => $statusCode,
            'duration_ms' => $durationMs
        ], JSON_UNESCAPED_SLASHES));
    });
}

function getRequestId(): string
{
    return (string) ($GLOBALS['REQUEST_ID'] ?? 'unknown-request-id');
}

function getEnvValue(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value !== false && $value !== '') {
        return $value;
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return (string) $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return (string) $_SERVER[$key];
    }
    return $default;
}

function getHeadersSafe(): array
{
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            return $headers;
        }
    }
    return [];
}

function setCorsHeaders(array $allowedMethods = ['POST', 'OPTIONS']): void
{
    $allowedOriginsRaw = getEnvValue('ALLOWED_ORIGINS', 'https://refatishere.free.nf');
    $allowedOrigins = array_values(
        array_filter(
            array_map('trim', explode(',', (string) $allowedOriginsRaw))
        )
    );

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    header('Access-Control-Allow-Methods: ' . implode(', ', $allowedMethods));
    header('Access-Control-Allow-Headers: Content-Type, X-API-Token, X-Request-Id');
}

function handleCorsPreflight(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse(array $payload, int $statusCode = 200): void
{
    if ($statusCode >= 400 && !array_key_exists('request_id', $payload)) {
        $payload['request_id'] = getRequestId();
    }
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function successResponse($data, int $statusCode = 200): void
{
    jsonResponse([
        'status' => 'success',
        'success' => true,
        'data' => $data
    ], $statusCode);
}

function errorResponse(string $message, int $statusCode = 400, array $extra = []): void
{
    $payload = array_merge([
        'status' => 'error',
        'success' => false,
        'message' => $message,
        'error' => $message,
        'request_id' => getRequestId()
    ], $extra);
    jsonResponse($payload, $statusCode);
}

function logErrorEvent(string $event, string $message, array $context = []): void
{
    $log = array_merge([
        'service' => (string) ($GLOBALS['REQUEST_SERVICE'] ?? 'crypto-backend'),
        'event' => $event,
        'request_id' => getRequestId(),
        'message' => $message
    ], $context);
    error_log(json_encode($log, JSON_UNESCAPED_SLASHES));
}

function requireMethod(array $allowedMethods): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, $allowedMethods, true)) {
        errorResponse('Method not allowed', 405, ['allowed_methods' => $allowedMethods]);
    }
}

function requireApiToken(): void
{
    $expected = getEnvValue('API_TOKEN_CRYPTO', getEnvValue('API_TOKEN'));
    if ($expected === null || $expected === '') {
        logErrorEvent('auth_error', 'API_TOKEN_CRYPTO/API_TOKEN is not configured for crypto backend');
        errorResponse('Server not configured', 500);
    }

    $provided = '';
    foreach (getHeadersSafe() as $key => $value) {
        if (strtolower((string) $key) === 'x-api-token') {
            $provided = (string) $value;
            break;
        }
    }
    if ($provided === '' && isset($_SERVER['HTTP_X_API_TOKEN'])) {
        $provided = (string) $_SERVER['HTTP_X_API_TOKEN'];
    }

    if ($provided === '' || !hash_equals($expected, $provided)) {
        errorResponse('Unauthorized', 401);
    }
}

function mapBinanceErrorMessage(int $code, array $data): string
{
    $upstreamMessage = trim((string) ($data['msg'] ?? ''));
    $upstreamCode = (int) ($data['code'] ?? 0);

    if ($upstreamCode === -1021) {
        return 'Timestamp/recvWindow validation failed. Check server clock drift and recvWindow setting.';
    }
    if ($upstreamCode === -1022) {
        return 'Binance signature validation failed. Verify API secret and signed parameters.';
    }
    if ($upstreamCode === -2015) {
        return 'Invalid Binance API key/secret or API permissions.';
    }

    if ($upstreamMessage !== '') {
        return $upstreamMessage;
    }

    if ($code === 429 || $code === 418) {
        return 'Upstream rate limit reached. Please retry shortly.';
    }
    if ($code >= 500) {
        return 'Upstream exchange is temporarily unavailable.';
    }
    return 'Binance request failed.';
}

function signRequest(string $queryString, string $apiSecret): string
{
    return hash_hmac('sha256', $queryString, $apiSecret);
}

function buildClientOrderId(string $symbol = 'ORD'): string
{
    $symbolPart = strtoupper(preg_replace('/[^A-Z0-9]/', '', $symbol) ?: 'ORD');
    $symbolPart = substr($symbolPart, 0, 8);
    $timePart = (string) round(microtime(true) * 1000);
    $randomPart = substr(bin2hex(random_bytes(4)), 0, 8);
    $id = "WEB_{$symbolPart}_{$timePart}_{$randomPart}";
    return substr($id, 0, 36);
}

function isExecutionStatusUnknown(int $httpCode, int $curlErrorNo, array $upstreamData): bool
{
    $transportUnknownErrors = [6, 7, 28, 35, 52, 56];
    if (in_array($curlErrorNo, $transportUnknownErrors, true)) {
        return true;
    }

    if (in_array($httpCode, [502, 503, 504], true)) {
        return true;
    }

    $upstreamCode = (int) ($upstreamData['code'] ?? 0);
    if (in_array($upstreamCode, [-1001, -1007], true)) {
        return true;
    }

    return false;
}

function makeRequest(string $url, string $method, array $headers, ?string $data = null, array $options = []): array
{
    $maxAttempts = (int) ($options['maxAttempts'] ?? 3);
    $retryDelayMs = (int) ($options['retryDelayMs'] ?? 300);
    $connectTimeout = (int) ($options['connectTimeout'] ?? 10);
    $timeout = (int) ($options['timeout'] ?? 30);
    if ($maxAttempts < 1) {
        $maxAttempts = 1;
    }
    if ($retryDelayMs < 0) {
        $retryDelayMs = 0;
    }
    if ($connectTimeout < 1) {
        $connectTimeout = 1;
    }
    if ($timeout < 1) {
        $timeout = 1;
    }
    $lastErrorMessage = 'Request failed';
    $lastHttpCode = 500;
    $lastData = [];
    $lastCurlErrorNo = 0;

    for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $connectTimeout);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data !== null && $data !== '') {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErrorNo = curl_errno($ch);
        $curlError = curl_error($ch);
        curl_close($ch);
        $lastCurlErrorNo = $curlErrorNo;

        if ($response === false) {
            $lastErrorMessage = $curlError !== '' ? $curlError : 'Request failed';
            $lastHttpCode = $httpCode > 0 ? $httpCode : 500;
            if ($attempt < $maxAttempts) {
                usleep($retryDelayMs * 1000);
                continue;
            }
            break;
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            $decoded = ['raw' => $response];
        }
        $lastData = $decoded;
        $lastHttpCode = $httpCode;

        $shouldRetry = ($httpCode >= 500 || $httpCode === 429 || $curlErrorNo !== 0) && $attempt < $maxAttempts;
        if ($shouldRetry) {
            usleep($retryDelayMs * 1000);
            continue;
        }

        return [
            'code' => $httpCode > 0 ? $httpCode : 500,
            'data' => $decoded,
            'curl_errno' => $curlErrorNo
        ];
    }

    return [
        'code' => $lastHttpCode > 0 ? $lastHttpCode : 500,
        'data' => $lastData ?: ['msg' => $lastErrorMessage],
        'curl_errno' => $lastCurlErrorNo
    ];
}
