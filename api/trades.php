<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

requireMethod(['GET', 'POST']);

$method = $_SERVER['REQUEST_METHOD'];

function hasCreatedAtColumn(mysqli $conn): bool
{
    $result = $conn->query("SHOW COLUMNS FROM trades LIKE 'created_at'");
    if ($result === false) {
        return false;
    }
    $hasColumn = $result->num_rows > 0;
    $result->close();
    return $hasColumn;
}

function getIntQueryParam(string $key, int $default): int
{
    $value = $_GET[$key] ?? null;
    if ($value === null || $value === '') {
        return $default;
    }
    if (!is_numeric($value)) {
        errorResponse("Invalid '{$key}' parameter", 422);
    }
    $parsed = (int) $value;
    if ($parsed <= 0) {
        errorResponse("Invalid '{$key}' parameter", 422);
    }
    return $parsed;
}

function getDateQueryParam(string $key): ?string
{
    $value = trim((string) ($_GET[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('Y-m-d', $value);
    if ($date === false || $date->format('Y-m-d') !== $value) {
        errorResponse("Invalid '{$key}' date format. Use YYYY-MM-DD.", 422);
    }
    return $value;
}

function bindParams(mysqli_stmt $stmt, string $types, array $values): bool
{
    if ($types === '') {
        return true;
    }

    $params = [$types];
    foreach ($values as $index => $value) {
        $params[] = &$values[$index];
    }

    return (bool) call_user_func_array([$stmt, 'bind_param'], $params);
}

if ($method === 'GET') {
    $hasCreatedAt = hasCreatedAtColumn($conn);
    $hasQueryEnhancements = isset($_GET['page']) || isset($_GET['limit']) || isset($_GET['from']) || isset($_GET['to']) || isset($_GET['sort']);

    if (!$hasQueryEnhancements) {
        $selectFields = 'id, pair, quantity, entry_price, exit_price, fees, learnings';
        if ($hasCreatedAt) {
            $selectFields .= ', created_at';
        }

        $sql = "SELECT {$selectFields} FROM trades ORDER BY id DESC";
        $result = $conn->query($sql);
        if ($result === false) {
            logErrorEvent('db_query_error', 'Failed to fetch trades', ['error' => $conn->error]);
            $conn->close();
            errorResponse('Failed to fetch trades', 500);
        }

        $trades = [];
        while ($row = $result->fetch_assoc()) {
            $trades[] = $row;
        }
        $result->close();
        $conn->close();

        jsonResponse($trades);
    }

    $page = getIntQueryParam('page', 1);
    $limit = min(getIntQueryParam('limit', 25), 200);
    $offset = ($page - 1) * $limit;

    $fromDate = getDateQueryParam('from');
    $toDate = getDateQueryParam('to');
    if (($fromDate !== null || $toDate !== null) && !$hasCreatedAt) {
        $conn->close();
        errorResponse("Date filtering requires 'created_at' column in trades table", 422);
    }

    $sortParam = trim((string) ($_GET['sort'] ?? 'id_desc'));
    $allowedSort = [
        'id_asc' => 'id ASC',
        'id_desc' => 'id DESC',
        'entry_price_asc' => 'entry_price ASC',
        'entry_price_desc' => 'entry_price DESC',
        'exit_price_asc' => 'exit_price ASC',
        'exit_price_desc' => 'exit_price DESC'
    ];
    if ($hasCreatedAt) {
        $allowedSort['created_at_asc'] = 'created_at ASC';
        $allowedSort['created_at_desc'] = 'created_at DESC';
    }
    if (!isset($allowedSort[$sortParam])) {
        $conn->close();
        errorResponse("Invalid 'sort' parameter", 422, ['allowed_sort' => array_keys($allowedSort)]);
    }

    $where = [];
    $params = [];
    $types = '';
    if ($fromDate !== null) {
        $where[] = 'DATE(created_at) >= ?';
        $params[] = $fromDate;
        $types .= 's';
    }
    if ($toDate !== null) {
        $where[] = 'DATE(created_at) <= ?';
        $params[] = $toDate;
        $types .= 's';
    }
    $whereSql = empty($where) ? '' : ('WHERE ' . implode(' AND ', $where));

    $countSql = "SELECT COUNT(*) AS total FROM trades {$whereSql}";
    $countStmt = $conn->prepare($countSql);
    if ($countStmt === false) {
        logErrorEvent('db_prepare_error', 'Failed to prepare trades count statement', ['error' => $conn->error]);
        $conn->close();
        errorResponse('Failed to fetch trades', 500);
    }
    if ($types !== '' && !bindParams($countStmt, $types, $params)) {
        $countStmt->close();
        $conn->close();
        errorResponse('Failed to fetch trades', 500);
    }
    if (!$countStmt->execute()) {
        logErrorEvent('db_exec_error', 'Failed to execute trades count statement', ['error' => $countStmt->error]);
        $countStmt->close();
        $conn->close();
        errorResponse('Failed to fetch trades', 500);
    }
    $countResult = $countStmt->get_result();
    $totalRows = 0;
    if ($countResult !== false) {
        $totalRow = $countResult->fetch_assoc();
        $totalRows = (int) ($totalRow['total'] ?? 0);
    }
    $countStmt->close();

    $selectFields = 'id, pair, quantity, entry_price, exit_price, fees, learnings';
    if ($hasCreatedAt) {
        $selectFields .= ', created_at';
    }

    $sql = "SELECT {$selectFields} FROM trades {$whereSql} ORDER BY {$allowedSort[$sortParam]} LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        logErrorEvent('db_prepare_error', 'Failed to prepare trades query', ['error' => $conn->error]);
        $conn->close();
        errorResponse('Failed to fetch trades', 500);
    }

    $paramsWithPaging = $params;
    $paramsWithPaging[] = $limit;
    $paramsWithPaging[] = $offset;
    $typesWithPaging = $types . 'ii';
    if (!bindParams($stmt, $typesWithPaging, $paramsWithPaging)) {
        $stmt->close();
        $conn->close();
        errorResponse('Failed to fetch trades', 500);
    }

    if (!$stmt->execute()) {
        logErrorEvent('db_exec_error', 'Failed to execute trades query', ['error' => $stmt->error]);
        $stmt->close();
        $conn->close();
        errorResponse('Failed to fetch trades', 500);
    }

    $result = $stmt->get_result();
    if ($result === false) {
        $stmt->close();
        $conn->close();
        errorResponse('Failed to fetch trades', 500);
    }

    $trades = [];
    while ($row = $result->fetch_assoc()) {
        $trades[] = $row;
    }
    $stmt->close();
    $conn->close();

    successResponse($trades, [
        'page' => $page,
        'limit' => $limit,
        'total' => $totalRows,
        'total_pages' => $limit > 0 ? (int) ceil($totalRows / $limit) : 0,
        'has_more' => ($offset + count($trades)) < $totalRows,
        'sort' => $sortParam,
        'filters' => [
            'from' => $fromDate,
            'to' => $toDate
        ]
    ]);
}

$data = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($data)) {
    errorResponse('Invalid JSON payload', 400);
}

$pair = strtoupper(trim((string) ($data['pair'] ?? '')));
$quantity = (float) ($data['quantity'] ?? 0);
$entryPrice = (float) ($data['entryPrice'] ?? 0);
$exitPrice = (float) ($data['exitPrice'] ?? 0);
$fees = (float) ($data['fees'] ?? 0);
$learnings = trim((string) ($data['learnings'] ?? ''));

if (!preg_match('/^[A-Z0-9._-]{3,20}(\/[A-Z0-9._-]{2,20})?$/', $pair)) {
    $conn->close();
    errorResponse('Invalid trade pair format', 422);
}

if ($quantity <= 0 || $entryPrice <= 0 || $exitPrice <= 0 || $fees < 0) {
    $conn->close();
    errorResponse('Invalid trade data', 422);
}

if ($quantity > 100000000 || $entryPrice > 100000000 || $exitPrice > 100000000 || $fees > 100000000) {
    $conn->close();
    errorResponse('Trade values exceed allowed limits', 422);
}

$stmt = $conn->prepare(
    'INSERT INTO trades (pair, quantity, entry_price, exit_price, fees, learnings) VALUES (?, ?, ?, ?, ?, ?)'
);
if ($stmt === false) {
    logErrorEvent('db_prepare_error', 'Failed to prepare insert trade statement', ['error' => $conn->error]);
    $conn->close();
    errorResponse('Failed to save trade', 500);
}

$stmt->bind_param('sdddds', $pair, $quantity, $entryPrice, $exitPrice, $fees, $learnings);
if (!$stmt->execute()) {
    logErrorEvent('db_exec_error', 'Failed to insert trade', ['error' => $stmt->error]);
    $stmt->close();
    $conn->close();
    errorResponse('Failed to save trade', 500);
}

$lastId = (int) $conn->insert_id;
$stmt->close();
$conn->close();

successResponse(
    [
        'id' => $lastId,
        'pair' => $pair,
        'quantity' => $quantity,
        'entry_price' => $entryPrice,
        'exit_price' => $exitPrice,
        'fees' => $fees,
        'learnings' => $learnings
    ],
    [],
    201
);
