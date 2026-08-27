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
      created_at timestamptz not null default now()
    );

    create table if not exists text_chunks (
      text_id uuid not null references texts(id) on delete cascade,
      idx int not null,
      original text not null,
      words jsonb,
      translation text,
      primary key (text_id, idx)
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
