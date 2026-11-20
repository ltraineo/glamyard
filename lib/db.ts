import { SEED_EVENTS } from "./seed";

type Row = Record<string, any>;
type Run = (sql: string, params?: any[]) => Promise<Row[]>;

const SCHEMA = [
  `create table if not exists users (
    id serial primary key,
    name text not null,
    email text unique,
    headline text not null default '',
    linkedin_sub text unique,
    avatar_url text,
    invited_by integer references users(id) on delete set null,
    is_admin boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists invites (
    code text primary key,
    inviter_id integer not null references users(id) on delete cascade,
    used_by integer references users(id) on delete set null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists events (
    id serial primary key,
    slug text unique not null,
    name text not null,
    start_date text,
    end_date text,
    city text not null default '',
    url text not null default '',
    note text not null default ''
  )`,
  `create table if not exists checkins (
    user_id integer not null references users(id) on delete cascade,
    event_id integer not null references events(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, event_id)
  )`,
  `alter table users add column if not exists google_sub text unique`,
  `alter table users add column if not exists linkedin_url text`,
  `create table if not exists login_tokens (
    hash text primary key,
    email text not null,
    name text not null default '',
    headline text not null default '',
    invite_code text,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists friendships (
    requester_id integer not null references users(id) on delete cascade,
    addressee_id integer not null references users(id) on delete cascade,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    accepted_at timestamptz,
    primary key (requester_id, addressee_id),
    check (requester_id <> addressee_id)
  )`,
  `create unique index if not exists friendships_pair
    on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))`,
  `create table if not exists suggestions (
    id serial primary key,
    url text not null,
    name text not null default '',
    start_date text,
    end_date text,
    city text not null default '',
    suggested_by integer references users(id) on delete set null,
    status text not null default 'pending',
    event_id integer references events(id) on delete set null,
    created_at timestamptz not null default now()
  )`,
];

async function init(): Promise<Run> {
  let run: Run;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 3 });
    run = async (sql, params = []) => (await pool.query(sql, params)).rows;
  } else if (process.env.VERCEL) {
    throw new Error("No database connected. Set DATABASE_URL to a Postgres connection string.");
  } else {
    // Local development fallback: Postgres compiled to WASM, stored in ./.data
    const { PGlite } = await import("@electric-sql/pglite");
    const lite = new PGlite(process.env.PGLITE_DIR || "./.data");
    run = async (sql, params = []) => (await lite.query(sql, params)).rows as Row[];
  }
  for (const stmt of SCHEMA) await run(stmt);
  for (const e of SEED_EVENTS) {
    await run(
      `insert into events (slug, name, start_date, end_date, city, url, note)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (slug) do nothing`,
      [e.slug, e.name, e.start, e.end, e.city, e.url, e.note || ""]
    );
  }
  return run;
}

const g = globalThis as unknown as { __db?: Promise<Run> };

export async function q(sql: string, params: any[] = []): Promise<Row[]> {
  g.__db ??= init();
  const run = await g.__db;
  return run(sql, params);
}
