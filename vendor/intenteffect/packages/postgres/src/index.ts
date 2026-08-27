import pg from 'pg'
import {
  err,
  errorMessage,
  intentEffectError,
  ok,
  type IntentEffectError,
  type Result,
  type WireEvent,
} from '@intenteffect/core'
import type {
  EventStore,
  IntentMeta,
  IntentOutcome,
  IntentRun,
} from '@intenteffect/server'

export interface PostgresStoreConfig {
  connectionString: string
  /** NOTIFY channel used as the cross-process wake-up signal. */
  channel?: string
  /** Safety-net poll interval in case a NOTIFY is missed. */
  pollIntervalMs?: number
  pool?: pg.Pool
}

const MIGRATION_SQL = `
create table if not exists intent_effect_intents (
  id uuid primary key,
  type text not null,
  actor_id text,
  tenant_id text,
  status text not null,
  error jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists intent_effect_events (
  id bigint generated always as identity primary key,
  type text not null,
  data jsonb not null,
  intent_id uuid,
  causation_id bigint,
  correlation_id text,
  actor_id text,
  tenant_id text,
  created_at timestamptz not null default now()
);

create index if not exists intent_effect_events_intent_id_idx
  on intent_effect_events (intent_id);
`

interface EventRow {
  id: string | number
  type: string
  data: unknown
  intent_id: string | null
  causation_id: string | number | null
  correlation_id: string | null
  actor_id: string | null
  tenant_id: string | null
  created_at: Date
}

function toWireEvent(row: EventRow): WireEvent {
  return {
    id: Number(row.id),
    type: row.type,
    data: row.data,
    intentId: row.intent_id,
    causationId: row.causation_id === null ? null : Number(row.causation_id),
    correlationId: row.correlation_id,
    actorId: row.actor_id,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
  }
}

function storeError(cause: unknown): IntentEffectError {
  return intentEffectError('store_failed', errorMessage(cause))
}

export class PostgresStore implements EventStore {
  readonly pool: pg.Pool
  private readonly channel: string
  private readonly pollIntervalMs: number
  private listenClient: pg.Client | null = null
  private listenStopped = false

  constructor(private readonly config: PostgresStoreConfig) {
    this.pool = config.pool ?? new pg.Pool({ connectionString: config.connectionString })
    this.channel = config.channel ?? 'intent_effect_events'
    this.pollIntervalMs = config.pollIntervalMs ?? 15_000
  }

  async migrate(): Promise<Result<void, IntentEffectError>> {
    try {
      await this.pool.query(MIGRATION_SQL)
      return ok(undefined)
    } catch (cause) {
      return err(storeError(cause))
    }
  }

  /**
   * Runs the intent's mutation, the event append and the intent record in ONE
   * transaction. Idempotency: the primary-key insert on intent_effect_intents
   * serializes concurrent duplicates (the second blocks on the row lock, then
   * sees the conflict) and lets retries replay the stored outcome.
   */
  async executeIntent(
    meta: IntentMeta,
    run: IntentRun,
  ): Promise<Result<IntentOutcome, IntentEffectError>> {
    const client = await this.pool.connect()
    try {
      await client.query('begin')
      const claimed = await client.query(
        `insert into intent_effect_intents (id, type, actor_id, tenant_id, status)
         values ($1, $2, $3, $4, 'pending')
         on conflict (id) do nothing
         returning id`,
        [meta.intentId, meta.type, meta.actorId, meta.tenantId],
      )

      if (claimed.rowCount === 0) {
        // Someone already executed (or is executing) this intentId.
        await client.query('rollback')
        return await this.resolveExistingIntent(meta.intentId)
      }

      const outcome = await run(client)
      if (!outcome.ok) {
        await client.query('rollback')
        await this.recordFailure(meta, outcome.error)
        return outcome
      }

      const events: WireEvent[] = []
      for (const newEvent of outcome.value) {
        const inserted = await client.query(
          `insert into intent_effect_events
             (type, data, intent_id, correlation_id, actor_id, tenant_id)
           values ($1, $2, $3, $4, $5, $6)
           returning id, type, data, intent_id, causation_id, correlation_id,
                     actor_id, tenant_id, created_at`,
          [
            newEvent.type,
            JSON.stringify(newEvent.data),
            meta.intentId,
            meta.correlationId,
            meta.actorId,
            meta.tenantId,
          ],
        )
        events.push(toWireEvent(inserted.rows[0] as EventRow))
      }

      await client.query(
        `update intent_effect_intents
         set status = 'completed', completed_at = now()
         where id = $1`,
        [meta.intentId],
      )
      // NOTIFY fires on commit — exactly the "new events exist" semantics we want.
      await client.query('select pg_notify($1, $2)', [this.channel, ''])
      await client.query('commit')

      return ok({ deduped: false, events })
    } catch (cause) {
      try {
        await client.query('rollback')
      } catch {
        /* connection-level failure; nothing to roll back */
      }
      return err(storeError(cause))
    } finally {
      client.release()
    }
  }

  /** Replay the stored outcome of a previously executed intentId. */
  private async resolveExistingIntent(
    intentId: string,
  ): Promise<Result<IntentOutcome, IntentEffectError>> {
    // 'pending' is never committed, but poll briefly to be safe against races.
    for (let attempt = 0; attempt < 20; attempt++) {
      const existing = await this.pool.query(
        `select status, error from intent_effect_intents where id = $1`,
        [intentId],
      )
      const row = existing.rows[0] as { status: string; error: IntentEffectError | null } | undefined

      if (row?.status === 'completed') {
        const events = await this.pool.query(
          `select id, type, data, intent_id, causation_id, correlation_id,
                  actor_id, tenant_id, created_at
           from intent_effect_events
           where intent_id = $1
           order by id asc`,
          [intentId],
        )
        return ok({
          deduped: true,
          events: (events.rows as EventRow[]).map(toWireEvent),
        })
      }

      if (row?.status === 'failed') {
        const stored = row.error ?? intentEffectError('handler_failed', 'intent failed')
        return err({ ...stored, deduped: true })
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return err(
      intentEffectError(
        'intent_conflict',
        `intent ${intentId} is still executing elsewhere; retry later`,
      ),
    )
  }

  /**
   * Failures are recorded in their own transaction (the mutation rolled back)
   * so a retried intentId replays the failure instead of re-executing.
   * Send a fresh intentId to retry a failed intent.
   */
  private async recordFailure(meta: IntentMeta, error: IntentEffectError): Promise<void> {
    try {
      await this.pool.query(
        `insert into intent_effect_intents (id, type, actor_id, tenant_id, status, error, completed_at)
         values ($1, $2, $3, $4, 'failed', $5, now())
         on conflict (id) do nothing`,
        [meta.intentId, meta.type, meta.actorId, meta.tenantId, JSON.stringify(error)],
      )
    } catch {
      /* best-effort bookkeeping; the intent itself already failed */
    }
  }

  async fetchEventsAfter(
    cursor: number,
    limit = 1000,
  ): Promise<Result<WireEvent[], IntentEffectError>> {
    try {
      const result = await this.pool.query(
        `select id, type, data, intent_id, causation_id, correlation_id,
                actor_id, tenant_id, created_at
         from intent_effect_events
         where id > $1
         order by id asc
         limit $2`,
        [cursor, limit],
      )
      return ok((result.rows as EventRow[]).map(toWireEvent))
    } catch (cause) {
      return err(storeError(cause))
    }
  }

  async head(): Promise<Result<number, IntentEffectError>> {
    try {
      const result = await this.pool.query(
        `select coalesce(max(id), 0) as head from intent_effect_events`,
      )
      return ok(Number(result.rows[0].head))
    } catch (cause) {
      return err(storeError(cause))
    }
  }

  /**
   * Read a projection snapshot and its event cursor in one REPEATABLE READ
   * transaction, so the cursor is exactly consistent with the query result.
   */
  async snapshotProjection<T>(
    read: (tx: unknown) => Promise<T>,
  ): Promise<Result<{ result: T; cursor: number }, IntentEffectError>> {
    const client = await this.pool.connect()
    try {
      await client.query('begin isolation level repeatable read read only')
      const result = await read(client)
      const head = await client.query(
        `select coalesce(max(id), 0) as head from intent_effect_events`,
      )
      await client.query('commit')
      return ok({ result, cursor: Number(head.rows[0].head) })
    } catch (cause) {
      try {
        await client.query('rollback')
      } catch {
        /* ignore */
      }
      return err(storeError(cause))
    } finally {
      client.release()
    }
  }

  /**
   * Wake-up signaling: LISTEN on the notify channel plus a low-frequency
   * poll as a safety net. Never delivers events itself — subscribers re-read
   * the event table from their cursor.
   */
  subscribe(onWake: () => void): () => void {
    this.listenStopped = false
    const connectListener = async (): Promise<void> => {
      if (this.listenStopped) return
      const client = new pg.Client({ connectionString: this.config.connectionString })
      this.listenClient = client
      client.on('notification', () => onWake())
      client.on('error', () => {
        void client.end().catch(() => {})
        if (!this.listenStopped) setTimeout(() => void connectListener(), 1000)
      })
      try {
        await client.connect()
        await client.query(`listen "${this.channel.replaceAll('"', '""')}"`)
        onWake() // catch anything committed while (re)connecting
      } catch {
        void client.end().catch(() => {})
        if (!this.listenStopped) setTimeout(() => void connectListener(), 1000)
      }
    }
    void connectListener()

    const poll = setInterval(onWake, this.pollIntervalMs)
    return () => {
      this.listenStopped = true
      clearInterval(poll)
      void this.listenClient?.end().catch(() => {})
      this.listenClient = null
    }
  }

  async close(): Promise<void> {
    this.listenStopped = true
    await this.listenClient?.end().catch(() => {})
    this.listenClient = null
    await this.pool.end()
  }
}

export function createPostgresStore(config: PostgresStoreConfig): PostgresStore {
  return new PostgresStore(config)
}
