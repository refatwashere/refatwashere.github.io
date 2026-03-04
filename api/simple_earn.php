<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

requireMethod(['GET']);

$sql = 'SELECT id, asset, amount, product, apr, earnings, start_date FROM simple_earn ORDER BY start_date DESC';
$result = $conn->query($sql);
if ($result === false) {
    logErrorEvent('db_query_error', 'Failed to fetch simple_earn rows', ['error' => $conn->error]);
    $conn->close();
    errorResponse('Failed to fetch simple earn records', 500);
}

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

$conn->close();
successResponse($items);
