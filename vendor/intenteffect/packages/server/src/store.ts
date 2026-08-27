import type { IntentEffectError, Result, WireEvent } from '@intenteffect/core'

/** An event produced by a handler, not yet persisted. */
export interface NewEventRecord {
  readonly type: string
  readonly data: unknown
}

export interface IntentMeta {
  readonly intentId: string
  readonly type: string
  readonly actorId: string | null
  readonly tenantId: string | null
  readonly correlationId: string | null
}

/**
 * Runs the application mutation inside the store's transaction and returns
 * the events to append. `tx` is the store's raw transaction handle
 * (for the Postgres store: a pg.PoolClient).
 */
export type IntentRun = (
  tx: unknown,
) => Promise<Result<NewEventRecord[], IntentEffectError>>

export interface IntentOutcome {
  readonly deduped: boolean
  readonly events: WireEvent[]
}

/**
 * Storage SPI implemented by adapters (e.g. @intenteffect/postgres).
 *
 * Contract highlights:
 * - executeIntent must be idempotent per intentId: the mutation, the event
 *   append and the intent record commit atomically; a replayed intentId
 *   returns the stored outcome without re-running the mutation.
 * - snapshotProjection must return a { result, cursor } pair that is
 *   snapshot-consistent: every event with id <= cursor is reflected in result.
 * - subscribe is a wake-up signal only ("new events may exist"), never the
 *   source of truth; consumers re-read events from their cursor.
 */
export interface EventStore {
  migrate(): Promise<Result<void, IntentEffectError>>
  executeIntent(
    meta: IntentMeta,
    run: IntentRun,
  ): Promise<Result<IntentOutcome, IntentEffectError>>
  fetchEventsAfter(
    cursor: number,
    limit?: number,
  ): Promise<Result<WireEvent[], IntentEffectError>>
  /** The current highest event id (0 when the log is empty). */
  head(): Promise<Result<number, IntentEffectError>>
  snapshotProjection<T>(
    read: (tx: unknown) => Promise<T>,
  ): Promise<Result<{ result: T; cursor: number }, IntentEffectError>>
  subscribe(onWake: () => void): () => void
  close(): Promise<void>
}
