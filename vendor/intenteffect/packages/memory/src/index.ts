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

export interface MemoryStoreConfig {
  /**
   * The value handed to handlers and projection queries as the raw
   * transaction handle (mapped by the server's `tx` config hook). Point it
   * at whatever your tests mutate — an object of in-memory tables, a Map,
   * anything. Defaults to the store instance itself.
   */
  tx?: unknown
}

interface StoredIntent {
  status: 'completed' | 'failed'
  events: WireEvent[]
  error: IntentEffectError | null
}

/**
 * In-memory EventStore for tests: the full intent → event → projection loop
 * with zero infrastructure and the same contract as @intenteffect/postgres —
 * per-intentId idempotency with outcome replay, a monotonic event log, and
 * snapshot-consistent cursors.
 *
 * Writes and snapshots are serialized on one internal queue, which stands in
 * for the database's transactional isolation: a snapshot never observes a
 * half-applied intent, and its cursor exactly matches its data.
 */
export class MemoryStore implements EventStore {
  private readonly events: WireEvent[] = []
  private readonly intents = new Map<string, StoredIntent>()
  private readonly subscribers = new Set<() => void>()
  private readonly txHandle: unknown
  private queue: Promise<unknown> = Promise.resolve()

  constructor(config: MemoryStoreConfig = {}) {
    this.txHandle = config.tx ?? this
  }

  /** All persisted events, oldest first — handy for test assertions. */
  get log(): readonly WireEvent[] {
    return this.events
  }

  async migrate(): Promise<Result<void, IntentEffectError>> {
    return ok(undefined)
  }

  async executeIntent(
    meta: IntentMeta,
    run: IntentRun,
  ): Promise<Result<IntentOutcome, IntentEffectError>> {
    return this.serialized(async () => {
      const existing = this.intents.get(meta.intentId)
      if (existing) return this.replay(existing)

      let outcome: Awaited<ReturnType<IntentRun>>
      try {
        outcome = await run(this.txHandle)
      } catch (cause) {
        outcome = err(intentEffectError('handler_failed', errorMessage(cause)))
      }

      if (!outcome.ok) {
        this.intents.set(meta.intentId, {
          status: 'failed',
          events: [],
          error: outcome.error,
        })
        return outcome
      }

      const createdAt = new Date().toISOString()
      const events = outcome.value.map((newEvent): WireEvent => ({
        id: this.events.length + 1,
        type: newEvent.type,
        data: newEvent.data,
        intentId: meta.intentId,
        causationId: null,
        correlationId: meta.correlationId,
        actorId: meta.actorId,
        tenantId: meta.tenantId,
        createdAt,
      }))
      this.events.push(...events)
      this.intents.set(meta.intentId, { status: 'completed', events, error: null })
      queueMicrotask(() => this.notify())
      return ok({ deduped: false, events })
    })
  }

  async fetchEventsAfter(
    cursor: number,
    limit = 1000,
  ): Promise<Result<WireEvent[], IntentEffectError>> {
    return ok(this.events.filter((evt) => evt.id > cursor).slice(0, limit))
  }

  async head(): Promise<Result<number, IntentEffectError>> {
    return ok(this.events.length)
  }

  async snapshotProjection<T>(
    read: (tx: unknown) => Promise<T>,
  ): Promise<Result<{ result: T; cursor: number }, IntentEffectError>> {
    return this.serialized(async () => {
      const cursor = this.events.length
      try {
        return ok({ result: await read(this.txHandle), cursor })
      } catch (cause) {
        return err(intentEffectError('store_failed', errorMessage(cause)))
      }
    })
  }

  subscribe(onWake: () => void): () => void {
    this.subscribers.add(onWake)
    return () => {
      this.subscribers.delete(onWake)
    }
  }

  async close(): Promise<void> {
    this.subscribers.clear()
  }

  private replay(stored: StoredIntent): Result<IntentOutcome, IntentEffectError> {
    if (stored.status === 'completed') {
      return ok({ deduped: true, events: stored.events })
    }
    const error = stored.error ?? intentEffectError('handler_failed', 'intent failed')
    return err({ ...error, deduped: true })
  }

  private serialized<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task)
    this.queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  private notify(): void {
    for (const onWake of [...this.subscribers]) onWake()
  }
}

export function createMemoryStore(config: MemoryStoreConfig = {}): MemoryStore {
  return new MemoryStore(config)
}
