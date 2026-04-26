<?php
// ============================================================
// AWS Signature V4 — Presigned URL generator (S3-compatible)
// Funziona con Cloudflare R2 / AWS S3 / MinIO senza SDK.
// Compatibile con PHP 7.0+ (Altervista friendly).
// ============================================================

class R2Signer
{
    private $endpoint;
    private $accessKey;
    private $secretKey;
    private $region;
    private $bucket;

    /**
     * @param array $config Da php/r2-config.php
     */
    public function __construct(array $config)
    {
        $this->endpoint  = rtrim($config['endpoint'], '/');
        $this->accessKey = $config['access_key'];
        $this->secretKey = $config['secret_key'];
        $this->region    = $config['region'] ?? 'auto';
        $this->bucket    = $config['bucket'];
    }

    /**
     * Genera URL presigned per GET di un oggetto.
     * @param string $key Path object (es. "assets/sounds/click.mp3")
     * @param int $expires Validità in secondi (default 3600 = 1h)
     * @return string URL completa
     */
    public function presignedGetUrl(string $key, int $expires = 3600): string
    {
        $key = ltrim($key, '/');

        // Encoda path: ogni segmento separatamente, mantieni gli slash.
        $encodedKey = implode('/', array_map(function ($seg) {
            return rawurlencode($seg);
        }, explode('/', $key)));

        $host = parse_url($this->endpoint, PHP_URL_HOST);
        $path = '/' . $this->bucket . '/' . $encodedKey;

        $now       = gmdate('Ymd\THis\Z');
        $today     = gmdate('Ymd');
        $service   = 's3';
        $algorithm = 'AWS4-HMAC-SHA256';
        $scope     = "$today/{$this->region}/$service/aws4_request";
        $credential = "{$this->accessKey}/$scope";

        // Query string (deve essere ordinata alfabeticamente per la firma)
        $params = [
            'X-Amz-Algorithm'     => $algorithm,
            'X-Amz-Credential'    => $credential,
            'X-Amz-Date'          => $now,
            'X-Amz-Expires'       => $expires,
            'X-Amz-SignedHeaders' => 'host',
        ];
        ksort($params);
        $canonicalQuery = http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        // Canonical request
        $canonicalHeaders = "host:$host\n";
        $payloadHash      = 'UNSIGNED-PAYLOAD';
        $canonicalRequest = implode("\n", [
            'GET',
            $path,
            $canonicalQuery,
            $canonicalHeaders,
            'host',
            $payloadHash,
        ]);

        // String to sign
        $stringToSign = implode("\n", [
            $algorithm,
            $now,
            $scope,
            hash('sha256', $canonicalRequest),
        ]);

        // Derive signing key
        $kDate    = hash_hmac('sha256', $today,         'AWS4' . $this->secretKey, true);
        $kRegion  = hash_hmac('sha256', $this->region,  $kDate,                    true);
        $kService = hash_hmac('sha256', $service,       $kRegion,                  true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService,                 true);

        // Final signature
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);

        return "{$this->endpoint}{$path}?{$canonicalQuery}&X-Amz-Signature={$signature}";
    }
}
