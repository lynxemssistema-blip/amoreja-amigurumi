<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$paymentId = $_GET['id'] ?? '';
$token = $_GET['token'] ?? 'TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714';

if (empty($paymentId)) {
    http_response_code(400);
    echo json_encode(['error' => 'paymentId required']);
    exit();
}

$ch = curl_init('https://api.mercadopago.com/v1/payments/' . urlencode($paymentId));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => $curlError]);
    exit();
}

$mpData = json_decode($response, true);

echo json_encode([
    'status' => $mpData['status'] ?? 'pending',
    'status_detail' => $mpData['status_detail'] ?? '',
    'approved' => ($mpData['status'] ?? '') === 'approved'
]);
