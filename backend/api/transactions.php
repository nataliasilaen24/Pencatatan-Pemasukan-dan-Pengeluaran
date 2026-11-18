<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';

$pdo = createDatabaseConnection();
$user = requireUser();
$userId = (int)$user['id'];

function validTransactionId(string $id): bool
{
    return (bool)preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $id);
}

if (methodIs('GET')) {
    $where = ['t.user_id = :user_id'];
    $params = ['user_id' => $userId];

    if (!empty($_GET['start'])) {
        $where[] = 't.transaction_date >= :start';
        $params['start'] = $_GET['start'];
    }
    if (!empty($_GET['end'])) {
        $where[] = 't.transaction_date <= :end';
        $params['end'] = $_GET['end'];
    }
    if (in_array($_GET['type'] ?? '', ['pemasukan', 'pengeluaran'], true)) {
        $where[] = 't.type = :type';
        $params['type'] = $_GET['type'];
    }
    if (!empty($_GET['search'])) {
        $where[] = '(t.name ILIKE :search_name OR t.note ILIKE :search_note)';
        $params['search_name'] = '%' . $_GET['search'] . '%';
        $params['search_note'] = '%' . $_GET['search'] . '%';
    }

    $sql = 'SELECT t.id, t.transaction_date, t.name, c.name AS category,
                   t.type, t.amount, t.note, t.created_at
            FROM transactions t
            INNER JOIN categories c ON c.id = t.category_id
            WHERE ' . implode(' AND ', $where) . '
            ORDER BY t.transaction_date DESC, t.created_at DESC';
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $rows = $statement->fetchAll();
    foreach ($rows as &$row) {
        $row['amount'] = (float)$row['amount'];
    }
    unset($row);
    jsonResponse(200, ['transactions' => $rows]);
}

$body = readJsonBody();
$id = (string)($_GET['id'] ?? '');

if (methodIs('POST') || (methodIs('PUT') && $id !== '')) {
    $date = (string)($body['date'] ?? '');
    $name = trim((string)($body['name'] ?? ''));
    $type = (string)($body['type'] ?? '');
    $categoryId = (int)($body['category_id'] ?? 0);
    $amount = (float)($body['amount'] ?? 0);
    $note = trim((string)($body['note'] ?? ''));

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        jsonResponse(422, ['error' => 'Tanggal tidak valid.']);
    }
    [$year, $month, $day] = array_map('intval', explode('-', $date));
    if (!checkdate($month, $day, $year)) {
        jsonResponse(422, ['error' => 'Tanggal tidak valid.']);
    }
    if ($name === '' || strlen($name) > 100) {
        jsonResponse(422, ['error' => 'Nama transaksi tidak valid.']);
    }
    if (!in_array($type, ['pemasukan', 'pengeluaran'], true)) {
        jsonResponse(422, ['error' => 'Jenis transaksi tidak valid.']);
    }
    if (!is_numeric($body['amount'] ?? null) || $amount <= 0 || $amount > 9999999999999.99) {
        jsonResponse(422, ['error' => 'Jumlah transaksi tidak valid.']);
    }
    if (strlen($note) > 200) {
        jsonResponse(422, ['error' => 'Catatan maksimal 200 karakter.']);
    }

    $category = $pdo->prepare(
        'SELECT id FROM categories WHERE id = :id AND user_id = :user_id AND type = :type'
    );
    $category->execute(['id' => $categoryId, 'user_id' => $userId, 'type' => $type]);
    if (!$category->fetch()) {
        jsonResponse(422, ['error' => 'Kategori tidak valid untuk jenis transaksi ini.']);
    }

    if (methodIs('POST')) {
        $newId = sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
        $statement = $pdo->prepare(
            'INSERT INTO transactions
             (id, user_id, category_id, transaction_date, name, type, amount, note)
             VALUES (:id, :user_id, :category_id, :date, :name, :type, :amount, :note)'
        );
        $statement->execute([
            'id' => $newId,
            'user_id' => $userId,
            'category_id' => $categoryId,
            'date' => $date,
            'name' => $name,
            'type' => $type,
            'amount' => $amount,
            'note' => $note === '' ? null : $note,
        ]);
        jsonResponse(201, ['id' => $newId]);
    }

    if (!validTransactionId($id)) {
        jsonResponse(422, ['error' => 'ID transaksi tidak valid.']);
    }
    $statement = $pdo->prepare(
        'UPDATE transactions
         SET category_id = :category_id, transaction_date = :date, name = :name,
             type = :type, amount = :amount, note = :note
         WHERE id = :id AND user_id = :user_id'
    );
    $statement->execute([
        'category_id' => $categoryId,
        'date' => $date,
        'name' => $name,
        'type' => $type,
        'amount' => $amount,
        'note' => $note === '' ? null : $note,
        'id' => $id,
        'user_id' => $userId,
    ]);
    if ($statement->rowCount() === 0) {
        jsonResponse(404, ['error' => 'Transaksi tidak ditemukan.']);
    }
    jsonResponse(200, ['message' => 'Transaksi berhasil diperbarui.']);
}

if (methodIs('DELETE')) {
    if (!validTransactionId($id)) {
        jsonResponse(422, ['error' => 'ID transaksi tidak valid.']);
    }
    $statement = $pdo->prepare('DELETE FROM transactions WHERE id = :id AND user_id = :user_id');
    $statement->execute(['id' => $id, 'user_id' => $userId]);
    if ($statement->rowCount() === 0) {
        jsonResponse(404, ['error' => 'Transaksi tidak ditemukan.']);
    }
    jsonResponse(200, ['message' => 'Transaksi berhasil dihapus.']);
}

jsonResponse(400, ['error' => 'Permintaan transaksi tidak valid.']);
