<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

initRequestContext('legacy-api');
setCorsHeaders(['GET', 'POST', 'OPTIONS']);
handleCorsPreflight();
requireApiToken();

$conn = getDbConnection();
