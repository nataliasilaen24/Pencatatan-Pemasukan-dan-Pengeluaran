<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';

$pdo = createDatabaseConnection();
$user = requireUser();
$userId = (int)$user['id'];

if (methodIs('GET')) {
    $statement = $pdo->prepare(
        'SELECT id, type, name FROM categories WHERE user_id = :user_id ORDER BY type, name'
    );
    $statement->execute(['user_id' => $userId]);
    $rows = $statement->fetchAll();

    $categories = ['pemasukan' => [], 'pengeluaran' => []];
    foreach ($rows as $row) {
        $categories[$row['type']][] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
        ];
    }
    jsonResponse(200, $categories);
}

$body = readJsonBody();
$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (methodIs('POST')) {
    $type = (string)($body['type'] ?? '');
    $name = trim((string)($body['name'] ?? ''));
    if (!in_array($type, ['pemasukan', 'pengeluaran'], true) || $name === '' || strlen($name) > 40) {
        jsonResponse(422, ['error' => 'Jenis atau nama kategori tidak valid.']);
    }

    $statement = $pdo->prepare(
        'INSERT INTO categories (user_id, type, name) VALUES (:user_id, :type, :name) RETURNING id'
    );
    try {
        $statement->execute(['user_id' => $userId, 'type' => $type, 'name' => $name]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23505') {
            jsonResponse(409, ['error' => 'Nama kategori sudah digunakan.']);
        }
        throw $error;
    }
    jsonResponse(201, [
        'category' => ['id' => (int)$statement->fetchColumn(), 'type' => $type, 'name' => $name],
    ]);
}

if (methodIs('PUT') && $id > 0) {
    $name = trim((string)($body['name'] ?? ''));
    if ($name === '' || strlen($name) > 40) {
        jsonResponse(422, ['error' => 'Nama kategori tidak valid.']);
    }

    $statement = $pdo->prepare(
        'UPDATE categories SET name = :name WHERE id = :id AND user_id = :user_id'
    );
    try {
        $statement->execute(['name' => $name, 'id' => $id, 'user_id' => $userId]);
    } catch (PDOException $error) {
        if ($error->getCode() === '23505') {
            jsonResponse(409, ['error' => 'Nama kategori sudah digunakan.']);
        }
        throw $error;
    }
    if ($statement->rowCount() === 0) {
        jsonResponse(404, ['error' => 'Kategori tidak ditemukan.']);
    }
    jsonResponse(200, ['category' => ['id' => $id, 'name' => $name]]);
}

if (methodIs('DELETE') && $id > 0) {
    $used = $pdo->prepare(
        'SELECT id FROM transactions WHERE category_id = :category_id AND user_id = :user_id LIMIT 1'
    );
    $used->execute(['category_id' => $id, 'user_id' => $userId]);
    if ($used->fetch()) {
        jsonResponse(409, ['error' => 'Kategori masih digunakan transaksi.']);
    }

    $statement = $pdo->prepare('DELETE FROM categories WHERE id = :id AND user_id = :user_id');
    $statement->execute(['id' => $id, 'user_id' => $userId]);
    if ($statement->rowCount() === 0) {
        jsonResponse(404, ['error' => 'Kategori tidak ditemukan.']);
    }
    jsonResponse(200, ['message' => 'Kategori berhasil dihapus.']);
}

jsonResponse(400, ['error' => 'Permintaan kategori tidak valid.']);
