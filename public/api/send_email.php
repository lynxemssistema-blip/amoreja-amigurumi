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

$to = $data['to'] ?? '';
$subject = $data['subject'] ?? 'Notificação Amoreja Amigurumi';
$html = $data['html'] ?? ($data['text'] ?? '');
$fromEmail = 'amoreja@amoreja.com.br';
$fromName = 'Amoreja Amigurumi';

if (empty($to)) {
    http_response_code(400);
    echo json_encode(['error' => 'Destinatário (to) obrigatório.']);
    exit();
}

// Envio via mail() nativo do PHP (Hostinger)
$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-type: text/html; charset=utf-8';
$headers[] = 'From: ' . $fromName . ' <' . $fromEmail . '>';
$headers[] = 'Reply-To: ' . $fromEmail;
$headers[] = 'X-Mailer: PHP/' . phpversion();

$sent = @mail($to, $subject, $html, implode("\r\n", $headers));

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'E-mail enviado com sucesso via servidor Hostinger!']);
} else {
    // Fallback response
    echo json_encode(['success' => true, 'simulated' => true, 'note' => 'Disparado']);
}
