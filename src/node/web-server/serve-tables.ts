import { sql } from 'kysely';
import { db } from 'csdm/node/database/database';

// Server-only tables, created idempotently at serve startup.
// They are intentionally NOT part of the kysely Database schema / migrations
// so the desktop app schema version stays untouched.
export async function ensureServeTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS serve_users (
      steam_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS serve_share_code_jobs (
      id TEXT PRIMARY KEY,
      share_code TEXT NOT NULL,
      steam_id TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      error TEXT NOT NULL DEFAULT '',
      demo_path TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);

  await sql`
    CREATE INDEX IF NOT EXISTS serve_share_code_jobs_status_created_at_idx
    ON serve_share_code_jobs(status, created_at DESC)
  `.execute(db);

  await sql`
    CREATE TABLE IF NOT EXISTS serve_tracked_users (
      steam_id TEXT PRIMARY KEY,
      auth_code TEXT NOT NULL DEFAULT '',
      latest_share_code TEXT NOT NULL DEFAULT '',
      auto_download INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'never_checked',
      error TEXT NOT NULL DEFAULT '',
      last_check_at TIMESTAMPTZ,
      new_matches_found INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);
}
