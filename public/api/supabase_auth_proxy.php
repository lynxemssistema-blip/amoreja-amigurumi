<?php
// Proxy transparente seguro para Supabase Auth (Hostinger)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, apikey, prefer, range, x-client-info');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$path = isset($_GET['path']) ? $_GET['path'] : '';
$queryString = $_SERVER['QUERY_STRING'] ?? '';
parse_str($queryString, $queryParams);
unset($queryParams['path']);
$cleanQuery = http_build_query($queryParams);

$targetBase = 'https://supabase-supabaseamoreja.1cnep6.easypanel.host/auth/v1/';
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

if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$resHeaders = substr($response, 0, $headerSize);
$resBody = substr($response, $headerSize);

http_response_code($httpCode);

foreach (explode("\r\n", $resHeaders) as $h) {
    if (stripos($h, 'Content-Type:') === 0 || stripos($h, 'Set-Cookie:') === 0) {
        header($h);
    }
}

echo $resBody;
