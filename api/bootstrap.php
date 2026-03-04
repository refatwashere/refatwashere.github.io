<?php
declare(strict_types=1);

function initRequestContext(string $service = 'legacy-api'): void
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

    register_shutdown_function(static function (): void {
        $startMs = (int) ($GLOBALS['REQUEST_START_MS'] ?? (int) round(microtime(true) * 1000));
        $durationMs = (int) max(0, round(microtime(true) * 1000) - $startMs);
        $statusCode = http_response_code();
        if ($statusCode <= 0) {
            $statusCode = 500;
        }

        error_log(json_encode([
            'service' => (string) ($GLOBALS['REQUEST_SERVICE'] ?? 'legacy-api'),
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

function jsonResponse(array $payload, int $statusCode = 200): void
{
    if ($statusCode >= 400 && !array_key_exists('request_id', $payload)) {
        $payload['request_id'] = getRequestId();
    }

    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function successResponse($data, array $meta = [], int $statusCode = 200): void
{
    $payload = [
        'status' => 'success',
        'data' => $data
    ];
    if (!empty($meta)) {
        $payload['meta'] = $meta;
    }
    jsonResponse($payload, $statusCode);
}

function errorResponse(string $message, int $statusCode = 400, array $extra = []): void
{
    $payload = array_merge(
        [
            'status' => 'error',
            'message' => $message,
            'request_id' => getRequestId()
        ],
        $extra
    );
    jsonResponse($payload, $statusCode);
}

function logErrorEvent(string $event, string $message, array $context = []): void
{
    $log = array_merge(
        [
            'service' => (string) ($GLOBALS['REQUEST_SERVICE'] ?? 'legacy-api'),
            'event' => $event,
            'request_id' => getRequestId(),
            'message' => $message
        ],
        $context
    );
    error_log(json_encode($log, JSON_UNESCAPED_SLASHES));
}

function getRequestHeadersSafe(): array
{
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (is_array($headers)) {
            return $headers;
        }
    }
    return [];
}

function setCorsHeaders(array $allowedMethods = ['GET', 'POST', 'OPTIONS']): void
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

    header('Access-Control-Allow-Headers: Content-Type, X-API-Token, X-Request-Id');
    header('Access-Control-Allow-Methods: ' . implode(', ', $allowedMethods));
}

function handleCorsPreflight(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function requireApiToken(): void
{
    $expected = getEnvValue('API_TOKEN_LEGACY', getEnvValue('API_TOKEN'));
    if ($expected === null || $expected === '') {
        logErrorEvent('auth_error', 'API_TOKEN_LEGACY/API_TOKEN is not configured');
        errorResponse('Server not configured', 500);
    }

    $headers = getRequestHeadersSafe();
    $provided = '';
    foreach ($headers as $key => $value) {
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

function requireMethod(array $allowedMethods): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, $allowedMethods, true)) {
        errorResponse('Method not allowed', 405, ['allowed_methods' => $allowedMethods]);
    }
}

function getDbConnection(): mysqli
{
    $host = getEnvValue('DB_HOST');
    $user = getEnvValue('DB_USER');
    $pass = getEnvValue('DB_PASS');
    $name = getEnvValue('DB_NAME');

    if (!$host || !$user || $pass === null || !$name) {
        logErrorEvent(
            'db_config_error',
            'Database configuration is incomplete',
            ['required' => ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME']]
        );
        errorResponse('Database is not configured', 500);
    }

    mysqli_report(MYSQLI_REPORT_OFF);
    $conn = @new mysqli($host, $user, $pass, $name);
    if ($conn->connect_error) {
        logErrorEvent('db_connect_error', 'Database connection failed', ['error' => $conn->connect_error]);
        errorResponse('Database connection failed', 500);
    }

    return $conn;
}
