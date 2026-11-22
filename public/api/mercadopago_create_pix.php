<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true) ?: [];

$amount = isset($data['amount']) ? (float)$data['amount'] : 0;
$description = isset($data['description']) ? $data['description'] : 'Receita Digital Amoreja Amigurumi';
$payerEmail = isset($data['payerEmail']) ? $data['payerEmail'] : 'cliente@amoreja.com.br';
$payerName = isset($data['payerName']) ? $data['payerName'] : 'Cliente Amoreja';
$payerCpf = isset($data['payerCpf']) ? preg_replace('/\D/', '', $data['payerCpf']) : '';
$orderId = isset($data['orderId']) ? $data['orderId'] : ('order_' . time());
$token = isset($data['token']) && !empty($data['token']) ? $data['token'] : 'TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714';

$nameParts = explode(' ', trim($payerName));
$firstName = $nameParts[0] ?? 'Cliente';
$lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : 'Amoreja';

$payload = [
    'transaction_amount' => round($amount, 2),
    'description' => $description,
    'payment_method_id' => 'pix',
    'payer' => [
        'email' => $payerEmail,
        'first_name' => $firstName,
        'last_name' => $lastName
    ],
    'external_reference' => (string)$orderId
];

if (!empty($payerCpf)) {
    $payload['payer']['identification'] = [
        'type' => 'CPF',
        'number' => $payerCpf
    ];
}

$ch = curl_init('https://api.mercadopago.com/v1/payments');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Content-Type: application/json',
    'X-Idempotency-Key: pix_' . $orderId . '_' . time()
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro de conexão com Mercado Pago: ' . $curlError]);
    exit();
}

$mpData = json_decode($response, true);

if ($httpCode >= 400 || empty($mpData['id'])) {
    http_response_code($httpCode ?: 400);
    echo json_encode([
        'error' => $mpData['message'] ?? 'Erro ao gerar Pix no Mercado Pago',
        'details' => $mpData
    ]);
    exit();
}

$transactionData = $mpData['point_of_interaction']['transaction_data'] ?? [];

echo json_encode([
    'success' => true,
    'payment_id' => $mpData['id'],
    'status' => $mpData['status'] ?? 'pending',
    'qr_code' => $transactionData['qr_code'] ?? null,
    'qr_code_base64' => $transactionData['qr_code_base64'] ?? null,
    'ticket_url' => $transactionData['ticket_url'] ?? null
]);
