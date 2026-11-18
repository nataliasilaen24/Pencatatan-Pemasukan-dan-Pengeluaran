<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/bootstrap.php';

$pdo = createDatabaseConnection();
$action = $_GET['action'] ?? '';

if ($action === 'register' && methodIs('POST')) {
    $body = readJsonBody();
    $name = trim((string)($body['name'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');

    if ($name === '' || strlen($name) > 100) {
        jsonResponse(422, ['error' => 'Nama harus diisi maksimal 100 karakter.']);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 190) {
        jsonResponse(422, ['error' => 'Email tidak valid.']);
    }
    if (strlen($password) < 8) {
        jsonResponse(422, ['error' => 'Password minimal 8 karakter.']);
    }

    $exists = $pdo->prepare('SELECT id FROM users WHERE email = :email');
    $exists->execute(['email' => $email]);
    if ($exists->fetch()) {
        jsonResponse(409, ['error' => 'Email sudah digunakan.']);
    }

    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :password_hash) RETURNING id'
        );
        $insert->execute([
            'name' => $name,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ]);
        $userId = (int)$insert->fetchColumn();

        $defaults = [
            'pemasukan' => ['Gaji', 'Uang saku', 'Bonus', 'Pendapatan lainnya'],
            'pengeluaran' => ['Makanan', 'Transportasi', 'Pendidikan', 'Belanja', 'Kesehatan', 'Tagihan', 'Pengeluaran lainnya'],
        ];
        $categoryInsert = $pdo->prepare(
            'INSERT INTO categories (user_id, type, name) VALUES (:user_id, :type, :name)'
        );
        foreach ($defaults as $type => $names) {
            foreach ($names as $nameItem) {
                $categoryInsert->execute([
                    'user_id' => $userId,
                    'type' => $type,
                    'name' => $nameItem,
                ]);
            }
        }
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        jsonResponse(500, ['error' => 'Pendaftaran gagal.']);
    }

    $user = ['id' => $userId, 'name' => $name, 'email' => $email];
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    jsonResponse(201, ['user' => $user]);
}

if ($action === 'login' && methodIs('POST')) {
    $body = readJsonBody();
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');

    $statement = $pdo->prepare('SELECT id, name, email, password_hash FROM users WHERE email = :email');
    $statement->execute(['email' => $email]);
    $row = $statement->fetch();

    if (!$row || !password_verify($password, $row['password_hash'])) {
        jsonResponse(401, ['error' => 'Email atau password salah.']);
    }

    $user = ['id' => (int)$row['id'], 'name' => $row['name'], 'email' => $row['email']];
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    jsonResponse(200, ['user' => $user]);
}

if ($action === 'logout' && methodIs('POST')) {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    jsonResponse(200, ['message' => 'Logout berhasil.']);
}

if ($action === 'me' && methodIs('GET')) {
    jsonResponse(200, ['user' => requireUser()]);
}

jsonResponse(404, ['error' => 'Aksi autentikasi tidak ditemukan.']);
