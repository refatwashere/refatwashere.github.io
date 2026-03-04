<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

requireMethod(['GET']);

$sql = 'SELECT id, name, type, result, winnings, campaign_date FROM campaigns ORDER BY campaign_date DESC';
$result = $conn->query($sql);
if ($result === false) {
    logErrorEvent('db_query_error', 'Failed to fetch campaigns', ['error' => $conn->error]);
    $conn->close();
    errorResponse('Failed to fetch campaigns', 500);
}

$items = [];
while ($row = $result->fetch_assoc()) {
    $items[] = $row;
}

$conn->close();
successResponse($items);
