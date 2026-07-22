<?php
/**
 * Same-origin /api bridge for Hostinger File Manager → Docker backend.
 * Frontend calls https://crm.malwatrolley.com/api/... ; this proxies to Docker :8010.
 *
 * Edit api-backend.txt if Docker is not on 127.0.0.1:8010 (one line, e.g. http://10.0.0.1:8010).
 */
declare(strict_types=1);

$configFile = __DIR__ . '/api-backend.txt';
$backend = 'http://127.0.0.1:8010';
if (is_readable($configFile)) {
    $line = trim((string) file_get_contents($configFile));
    if ($line !== '' && !str_starts_with($line, '#')) {
        $backend = rtrim($line, '/');
    }
}

$path = isset($_GET['__path']) ? (string) $_GET['__path'] : '';
$path = ltrim(str_replace(['..', "\0"], '', $path), '/');
$qs = $_SERVER['QUERY_STRING'] ?? '';
$qs = preg_replace('/(?:^|&)__path=[^&]*/', '', $qs);
$qs = ltrim((string) $qs, '&');

$target = $backend . '/api';
if ($path !== '') {
    $target .= '/' . $path;
}
if ($qs !== '') {
    $target .= '?' . $qs;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');
if ($body === false) {
    $body = '';
}

$headers = [];
foreach ($_SERVER as $key => $value) {
    if (str_starts_with($key, 'HTTP_')) {
        $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
        if (in_array(strtolower($name), ['host', 'connection', 'content-length'], true)) {
            continue;
        }
        $headers[] = $name . ': ' . $value;
    }
}
if (isset($_SERVER['CONTENT_TYPE']) && $_SERVER['CONTENT_TYPE'] !== '') {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}
$headers[] = 'Accept: application/json, */*';
$headers[] = 'X-Forwarded-Proto: ' . ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');
$headers[] = 'X-Forwarded-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'crm.malwatrolley.com');

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_POSTFIELDS => ($method === 'GET' || $method === 'HEAD') ? null : $body,
]);

$response = curl_exec($ch);
if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'detail' => 'API bridge cannot reach Docker backend at ' . $backend,
        'error' => $err,
        'hint' => 'Confirm mt_crm_api is running on port 8010, or put the correct base URL in api-backend.txt',
    ]);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($response, 0, $headerSize);
$rawBody = substr($response, $headerSize);

http_response_code($status > 0 ? $status : 502);

$skip = ['transfer-encoding', 'connection', 'content-length', 'server'];
foreach (explode("\r\n", $rawHeaders) as $line) {
    if ($line === '' || str_starts_with($line, 'HTTP/')) {
        continue;
    }
    $pos = strpos($line, ':');
    if ($pos === false) {
        continue;
    }
    $name = substr($line, 0, $pos);
    $value = ltrim(substr($line, $pos + 1));
    if (in_array(strtolower($name), $skip, true)) {
        continue;
    }
    header($name . ': ' . $value, false);
}

echo $rawBody;
