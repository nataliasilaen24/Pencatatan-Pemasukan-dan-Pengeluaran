<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/backend/config/database.php';

$config = loadDatabaseConfig();

try {
    if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $config['name'])) {
        throw new RuntimeException('Nama database hanya boleh berisi huruf, angka, dan garis bawah.');
    }

    $serverDsn = sprintf(
        'pgsql:host=%s;port=%s;dbname=postgres',
        $config['host'],
        $config['port']
    );
    $server = new PDO($serverDsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $check = $server->prepare('SELECT 1 FROM pg_database WHERE datname = :name');
    $check->execute(['name' => $config['name']]);
    if (!$check->fetchColumn()) {
        $server->exec('CREATE DATABASE "' . $config['name'] . '"');
    }

    $dsn = sprintf(
        'pgsql:host=%s;port=%s;dbname=%s',
        $config['host'],
        $config['port'],
        $config['name']
    );
    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $sql = file_get_contents(__DIR__ . '/schema.sql');
    if ($sql === false) {
        throw new RuntimeException('schema.sql tidak dapat dibaca.');
    }

    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        $pdo->exec($statement);
    }

    echo "Database dan tabel KeuanganKu berhasil disiapkan.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'Setup database gagal: ' . $error->getMessage() . "\n");
    exit(1);
}
