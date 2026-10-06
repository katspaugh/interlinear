import pg from 'pg'

/**
 * DigitalOcean managed Postgres uses a self-signed CA chain. Its connection
 * strings carry `sslmode=require`, which node-postgres treats as
 * verify-full and then rejects. When DATABASE_SSL=no-verify is set (see
 * .do/app.yaml), rewrite it to pg's `no-verify` mode: TLS on, chain
 * verification off — the connection stays inside DO's private network.
 */
export function normalizeDatabaseUrl(url: string): string {
  if (process.env.DATABASE_SSL === 'no-verify') {
    return url.replace(/\bsslmode=require\b/, 'sslmode=no-verify')
  }
  return url
}

/**
 * A pool that fails loudly instead of hanging. With pg's defaults (no
 * timeouts, no TCP keepalive) a connection whose socket silently died — DO
 * restarts managed Postgres for maintenance — keeps its query pending
 * forever and is never released; once every pooled connection is stuck,
 * every request waits on the pool forever while the process looks healthy.
 */
export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString: normalizeDatabaseUrl(connectionString),
    // Waiting this long for a free connection means the pool is wedged.
    connectionTimeoutMillis: 10_000,
    // Client-side cap: rejects (and releases) a query whose socket went dead.
    query_timeout: 60_000,
    // Server-side cap for runaway queries.
    statement_timeout: 30_000,
    keepAlive: true,
    idleTimeoutMillis: 30_000,
  })
}

/** For the health check: does a trivial query come back in time? */
export async function pingDatabase(pool: pg.Pool, timeoutMs = 5_000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  try {
    return await Promise.race([pool.query('select 1').then(() => true), timeout])
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function migrateAppTables(pool: pg.Pool): Promise<void> {
  await pool.query(`
    create table if not exists texts (
      id uuid primary key,
      slug text not null unique,
      title text not null,
      orig_title text,
      source text,
      lang text not null,
      kind text not null default 'prose',
      status text not null default 'glossing',
      builtin boolean not null default false,
      translator text,
      created_at timestamptz not null default now()
    );

    -- Upgrade databases created before imported texts carried a credit line.
    alter table texts add column if not exists translator text;

    create table if not exists text_chunks (
      text_id uuid not null references texts(id) on delete cascade,
      idx int not null,
      original text not null,
      words jsonb,
      translation text,
      primary key (text_id, idx)
    );

    -- Queue for the admin-only text.import intent: one row per requested
    -- SuttaCentral uid; the worker expands collections into more rows and
    -- imports one sutta per tick.
    create table if not exists imports (
      uid text primary key,
      status text not null default 'pending',
      error text,
      requested_at timestamptz not null default now()
    );

    create table if not exists definitions (
      lang text not null,
      word text not null,
      tier text not null default 'fast',
      kind text not null default 'prose',
      status text not null default 'pending',
      definition jsonb,
      error text,
      created_at timestamptz not null default now(),
      primary key (lang, word, tier)
    );

    -- Upgrade databases created before definition tiers existed.
    do $$ begin
      if not exists (
        select 1 from information_schema.columns
        where table_name = 'definitions' and column_name = 'tier'
      ) then
        alter table definitions add column tier text not null default 'fast';
        alter table definitions drop constraint definitions_pkey;
        alter table definitions add primary key (lang, word, tier);
      end if;
    end $$;
  `)
}
