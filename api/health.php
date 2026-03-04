<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

initRequestContext('legacy-api');
setCorsHeaders(['GET', 'OPTIONS']);
handleCorsPreflight();
requireMethod(['GET']);

$required = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'API_TOKEN_LEGACY'];
$missing = [];
foreach ($required as $key) {
    $value = getEnvValue($key, '');
    if ($value === '') {
        $missing[] = $key;
    }
}

$statusCode = empty($missing) ? 200 : 500;

jsonResponse(
    [
        'status' => empty($missing) ? 'success' : 'error',
        'data' => [
            'service' => 'legacy-api',
            'ready' => empty($missing),
            'checked_at' => gmdate('c')
        ],
        'meta' => [
            'missing_count' => count($missing)
        ]
    ],
    $statusCode
);
