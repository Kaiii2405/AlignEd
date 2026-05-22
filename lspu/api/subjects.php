<?php
/* ═══════════════════════════════════════════════════════
   api/subjects.php
   GET  ?action=load&user_id=X          → load both lists
   POST ?action=save_added              → upsert added list
   POST ?action=save_enrolled           → upsert enrolled list
   POST ?action=remove_added            → delete one added entry
   POST ?action=remove_enrolled         → delete one enrolled entry
   POST ?action=clear_added             → clear all added for user
═══════════════════════════════════════════════════════ */
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
$db     = getDB();

/* ─── helper: normalise an entry row for JS ─────────── */
function fmtRow(array $r): array {
    return [
        'id'         => $r['entry_key'],
        'code'       => $r['code'],
        'title'      => $r['title'],
        'instructor' => $r['instructor'],
        'room'       => $r['room'],
        'days'       => json_decode($r['days'], true),
        'start'      => $r['start_time'],
        'end'        => $r['end_time'],
        'type'       => $r['type'],
        'units'      => isset($r['units']) ? (int)$r['units'] : null,
        'section'    => $r['section'] ?? null,
    ];
}

/* ── LOAD ───────────────────────────────────────────── */
if ($action === 'load') {
    $uid = (int)($_GET['user_id'] ?? 0);
    if (!$uid) fail('Missing user_id.');

    $st = $db->prepare('SELECT * FROM added_subjects    WHERE user_id = ? ORDER BY created_at');
    $st->execute([$uid]);
    $added = array_map('fmtRow', $st->fetchAll());

    $st = $db->prepare('SELECT * FROM enrolled_subjects WHERE user_id = ? ORDER BY created_at');
    $st->execute([$uid]);
    $enrolled = array_map('fmtRow', $st->fetchAll());

    ok(['added' => $added, 'enrolled' => $enrolled]);
}

/* ── SAVE ADDED (full sync — replace all) ───────────── */
if ($action === 'save_added') {
    $b   = body();
    $uid = (int)($b['user_id'] ?? 0);
    $entries = $b['entries'] ?? [];
    if (!$uid) fail('Missing user_id.');

    $db->prepare('DELETE FROM added_subjects WHERE user_id = ?')->execute([$uid]);

    $ins = $db->prepare(
        'INSERT INTO added_subjects
           (user_id, entry_key, code, title, instructor, room, days, start_time, end_time, type)
         VALUES (?,?,?,?,?,?,?,?,?,?)'
    );
    foreach ($entries as $e) {
        $ins->execute([
            $uid,
            $e['id']         ?? '',
            $e['code']       ?? '',
            $e['title']      ?? $e['code'] ?? '',
            $e['instructor'] ?? 'TBA',
            $e['room']       ?? 'TBA',
            json_encode($e['days'] ?? []),
            $e['start']      ?? '',
            $e['end']        ?? '',
            $e['type']       ?? 'LEC',
        ]);
    }
    ok(['saved' => count($entries)]);
}

/* ── SAVE ENROLLED (full sync — replace all) ────────── */
if ($action === 'save_enrolled') {
    $b   = body();
    $uid = (int)($b['user_id'] ?? 0);
    $entries = $b['entries'] ?? [];
    if (!$uid) fail('Missing user_id.');

    $db->prepare('DELETE FROM enrolled_subjects WHERE user_id = ?')->execute([$uid]);

    $ins = $db->prepare(
        'INSERT INTO enrolled_subjects
           (user_id, entry_key, code, title, instructor, room, days, start_time, end_time, type, units, section)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    foreach ($entries as $e) {
        $ins->execute([
            $uid,
            $e['id']         ?? '',
            $e['code']       ?? '',
            $e['title']      ?? $e['code'] ?? '',
            $e['instructor'] ?? 'TBA',
            $e['room']       ?? 'TBA',
            json_encode($e['days'] ?? []),
            $e['start']      ?? '',
            $e['end']        ?? '',
            $e['type']       ?? 'LEC',
            (int)($e['units'] ?? 3),
            $e['section']    ?? '',
        ]);
    }
    ok(['saved' => count($entries)]);
}

fail('Unknown action.', 404);