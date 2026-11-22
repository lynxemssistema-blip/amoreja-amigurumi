<?php
// Proxy transparente seguro para Supabase REST (Hostinger)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey, prefer, range, x-client-info');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$path = isset($_GET['path']) ? $_GET['path'] : '';
// Remove o parâmetro 'path' da query string para repassar apenas os filtros do PostgREST
$queryString = $_SERVER['QUERY_STRING'] ?? '';
parse_str($queryString, $queryParams);
unset($queryParams['path']);
$cleanQuery = http_build_query($queryParams);

$targetBase = 'https://supabase-supabaseamoreja.1cnep6.easypanel.host/rest/v1/';
$targetUrl = $targetBase . $path . ($cleanQuery ? '?' . $cleanQuery : '');

$ch = curl_init($targetUrl);

$headers = [];
$incomingHeaders = getallheaders();
foreach ($incomingHeaders as $key => $value) {
    $lower = strtolower($key);
    if (!in_array($lower, ['host', 'content-length'])) {
        $headers[] = "$key: $value";
    }
}
$headers[] = 'Host: supabase-supabaseamoreja.1cnep6.easypanel.host';

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Upstream unavailable', 'message' => $curlErr ?: 'Connection failed']);
    exit;
}

$resHeaders = substr($response, 0, $headerSize);
$resBody = substr($response, $headerSize);

if ($httpCode === 204) {
    foreach (explode("\r\n", $resHeaders) as $h) {
        if (stripos($h, 'Content-Range:') === 0 || stripos($h, 'Preference-Applied:') === 0) {
            header($h);
        }
    }
    http_response_code(204);
    exit;
}

$trimmedBody = trim($resBody);
if ($httpCode >= 400 && ($trimmedBody === '' || ($trimmedBody[0] !== '{' && $trimmedBody[0] !== '['))) {
    $errText = $trimmedBody !== '' ? $trimmedBody : "HTTP $httpCode";
    http_response_code($httpCode);
    header('Content-Type: application/json');
    echo json_encode(['error' => $errText, 'message' => $errText]);
    exit;
}

http_response_code($httpCode ?: 200);

// Repassar headers relevantes como Content-Type e Content-Range
foreach (explode("\r\n", $resHeaders) as $h) {
    if (stripos($h, 'Content-Type:') === 0 || stripos($h, 'Content-Range:') === 0 || stripos($h, 'Preference-Applied:') === 0) {
        header($h);
    }
}

echo $resBody;
