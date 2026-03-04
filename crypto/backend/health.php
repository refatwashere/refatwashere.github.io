<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

initRequestContext('crypto-backend');
setCorsHeaders(['GET', 'OPTIONS']);
handleCorsPreflight();
requireMethod(['GET']);

$required = ['API_TOKEN_CRYPTO'];
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
        'success' => empty($missing),
        'data' => [
            'service' => 'crypto-backend',
            'ready' => empty($missing),
            'checked_at' => gmdate('c')
        ],
        'meta' => [
            'missing_count' => count($missing)
        ]
    ],
    $statusCode
);
