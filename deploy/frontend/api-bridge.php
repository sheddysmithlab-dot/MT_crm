<?php
/**
 * Same-origin /api bridge: crm.malwatrolley.com/api → Docker FastAPI.
 *
 * Hostinger File Manager PHP and Docker VPS are often DIFFERENT machines.
 * Do NOT use 127.0.0.1 unless both run on the same VPS.
 *
 * Set backend in api-backend.txt (one URL per line, first reachable wins):
 *   http://YOUR_VPS_PUBLIC_IP:8010
 */
declare(strict_types=1);

function mt_crm_backends(): array
{
    $defaults = [
        'http://127.0.0.1:8010',
        'http://172.17.0.1:8010', // Docker bridge on same Linux host
    ];
    $configFile = __DIR__ . '/api-backend.txt';
    $list = [];
    if (is_readable($configFile)) {
        foreach (file($configFile, FILE_IGNORE_NEW_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $list[] = rtrim($line, '/');
        }
    }
    return array_values(array_unique(array_merge($list, $defaults)));
}

function mt_crm_pick_backend(array $backends): array
{
    $errors = [];
    foreach ($backends as $base) {
        $probe = $base . '/api/health/live';
        $ch = curl_init($probe);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_TIMEOUT => 4,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($body !== false && $code >= 200 && $code < 500) {
            return ['ok' => true, 'backend' => $base, 'probe' => $body, 'errors' => $errors];
        }
        $errors[] = $base . ' → ' . ($err !== '' ? $err : ('HTTP ' . $code));
    }
    return ['ok' => false, 'backend' => null, 'probe' => null, 'errors' => $errors];
}

$backends = mt_crm_backends();
$pick = mt_crm_pick_backend($backends);
if (!$pick['ok']) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'detail' => 'API bridge cannot reach Docker backend',
        'tried' => $pick['errors'],
        'fix' => [
            '1' => 'Hostinger → VPS → copy Public IP',
            '2' => 'Docker Compose: confirm mt_crm_api running, port 8010 published',
            '3' => 'VPS firewall / Hostinger Firewall: allow inbound TCP 8010',
            '4' => 'Edit api-backend.txt to ONE line: http://YOUR_VPS_IP:8010',
            '5' => 'Test in browser: http://YOUR_VPS_IP:8010/api/health/live',
        ],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$backend = $pick['backend'];

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
        'detail' => 'API bridge proxy failed for ' . $backend,
        'error' => $err,
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
