-- ═══════════════════════════════════════════════════════
--  LSPU Schedule Manager — Database Setup
--  Run this once in phpMyAdmin or MySQL CLI:
--    source /path/to/setup.sql;
-- ═══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS lspu_schedule
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lspu_schedule;

-- ── Users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120)        NOT NULL,
  email      VARCHAR(180)        NOT NULL UNIQUE,
  pass_hash  VARCHAR(255)        NOT NULL,
  section    VARCHAR(10)         DEFAULT NULL,
  created_at DATETIME            DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Added subjects (free-slot entries per user) ────────
CREATE TABLE IF NOT EXISTS added_subjects (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT                 NOT NULL,
  entry_key  VARCHAR(120)        NOT NULL,          -- client-side id
  code       VARCHAR(30)         NOT NULL,
  title      VARCHAR(150)        NOT NULL,
  instructor VARCHAR(100)        NOT NULL,
  room       VARCHAR(50)         NOT NULL,
  days       VARCHAR(60)         NOT NULL,           -- JSON array e.g. '["Mon","Wed"]'
  start_time VARCHAR(15)         NOT NULL,
  end_time   VARCHAR(15)         NOT NULL,
  type       VARCHAR(10)         NOT NULL DEFAULT 'LEC',
  created_at DATETIME            DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_entry (user_id, entry_key)
) ENGINE=InnoDB;

-- ── Enrolled subjects (browse-tab enrolments per user) ─
CREATE TABLE IF NOT EXISTS enrolled_subjects (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT                 NOT NULL,
  entry_key  VARCHAR(120)        NOT NULL,
  code       VARCHAR(30)         NOT NULL,
  title      VARCHAR(150)        NOT NULL,
  instructor VARCHAR(100)        NOT NULL,
  room       VARCHAR(50)         NOT NULL,
  days       VARCHAR(60)         NOT NULL,
  start_time VARCHAR(15)         NOT NULL,
  end_time   VARCHAR(15)         NOT NULL,
  type       VARCHAR(10)         NOT NULL DEFAULT 'LEC',
  units      TINYINT             DEFAULT 3,
  section    VARCHAR(10)         DEFAULT NULL,
  created_at DATETIME            DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_entry (user_id, entry_key)
) ENGINE=InnoDB;