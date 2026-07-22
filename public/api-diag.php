<?php
/** Open in browser: https://crm.malwatrolley.com/api-diag.php */
declare(strict_types=1);
header('Content-Type: application/json');

$configFile = __DIR__ . '/api-backend.txt';
$backends = [];
if (is_readable($configFile)) {
    foreach (file($configFile, FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);
        if ($line !== '' && !str_starts_with($line, '#')) {
            $backends[] = rtrim($line, '/');
        }
    }
}
$backends = array_values(array_unique(array_merge($backends, [
    'http://127.0.0.1:8010',
    'http://172.17.0.1:8010',
])));

$results = [];
foreach ($backends as $base) {
    $url = $base . '/api/health/live';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_TIMEOUT => 5,
    ]);
    $body = curl_exec($ch);
    $results[] = [
        'backend' => $base,
        'url' => $url,
        'http_code' => (int) curl_getinfo($ch, CURLINFO_HTTP_CODE),
        'curl_error' => curl_error($ch) ?: null,
        'body_preview' => is_string($body) ? substr($body, 0, 200) : null,
    ];
    curl_close($ch);
}

echo json_encode([
    'php_server_addr' => $_SERVER['SERVER_ADDR'] ?? null,
    'server_name' => $_SERVER['SERVER_NAME'] ?? null,
    'hint' => 'Edit api-backend.txt with http://VPS_PUBLIC_IP:8010 then refresh this page',
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
