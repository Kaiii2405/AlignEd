<?php
/* ═══════════════════════════════════════════════════════
   api/auth.php
   POST ?action=register   → create account
   POST ?action=login       → sign in
   POST ?action=set_section → save chosen section
═══════════════════════════════════════════════════════ */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$db     = getDB();

/* ── REGISTER ───────────────────────────────────────── */
if ($action === 'register') {
    $b     = body();
    $name  = trim($b['name']  ?? '');
    $email = strtolower(trim($b['email'] ?? ''));
    $pass  = $b['pass'] ?? '';

    if (!$name || !$email || !$pass) fail('Please fill in all fields.');
    if (strlen($pass) < 6)           fail('Password must be at least 6 characters.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Invalid email address.');

    // Check duplicate
    $chk = $db->prepare('SELECT id FROM users WHERE email = ?');
    $chk->execute([$email]);
    if ($chk->fetch()) fail('Email already registered.');

    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $ins  = $db->prepare('INSERT INTO users (name, email, pass_hash) VALUES (?,?,?)');
    $ins->execute([$name, $email, $hash]);
    $id = (int)$db->lastInsertId();

    ok(['user' => ['id' => $id, 'name' => $name, 'email' => $email, 'section' => null]]);
}

/* ── LOGIN ──────────────────────────────────────────── */
if ($action === 'login') {
    $b     = body();
    $email = strtolower(trim($b['email'] ?? ''));
    $pass  = $b['pass'] ?? '';

    if (!$email || !$pass) fail('Please enter your email and password.');

    $st = $db->prepare('SELECT * FROM users WHERE email = ?');
    $st->execute([$email]);
    $user = $st->fetch();

    if (!$user || !password_verify($pass, $user['pass_hash'])) {
        fail('Incorrect email or password.');
    }

    ok(['user' => [
        'id'      => (int)$user['id'],
        'name'    => $user['name'],
        'email'   => $user['email'],
        'section' => $user['section'],
    ]]);
}

/* ── SET SECTION ────────────────────────────────────── */
if ($action === 'set_section') {
    $b       = body();
    $uid     = (int)($b['user_id'] ?? 0);
    $section = trim($b['section'] ?? '');

    if (!$uid || !$section) fail('Missing user_id or section.');

    $st = $db->prepare('UPDATE users SET section = ? WHERE id = ?');
    $st->execute([$section, $uid]);

    ok(['section' => $section]);
}

/* ── UPDATE NAME ────────────────────────────────────── */
if ($action === 'update_name') {
    $b    = body();
    $uid  = (int)($b['user_id'] ?? 0);
    $name = trim($b['name'] ?? '');

    if (!$uid || !$name) fail('Missing user_id or name.');
    if (strlen($name) > 120) fail('Name too long.');

    $st = $db->prepare('UPDATE users SET name = ? WHERE id = ?');
    $st->execute([$name, $uid]);

    ok(['name' => $name]);
}

fail('Unknown action.', 404);