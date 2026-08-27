import type { WireEvent } from '@intenteffect/core'
import type { EventStore } from './store.js'

export interface SseSink<Ctx> {
  readonly ctx: Ctx
  /** Highest event id already delivered to this client. */
  cursor: number
  /** False while the connection is replaying missed events. */
  live: boolean
  closed: boolean
  write(chunk: string): void
}

export function formatSseEvent(evt: WireEvent): string {
  return `id: ${evt.id}\ndata: ${JSON.stringify(evt)}\n\n`
}

/**
 * Fans persisted events out to connected SSE clients.
 *
 * The hub never receives events directly — it is only woken up
 * ("new events may exist") and re-reads the durable log from its cursor.
 * That makes delivery identical for locally-committed intents, intents
 * committed by other server processes, and events missed while asleep.
 */
export class EventHub<Ctx> {
  private lastKnown = 0
  private readonly sinks = new Set<SseSink<Ctx>>()
  private pumping = false
  private pumpQueued = false

  constructor(
    private readonly store: EventStore,
    private readonly authorize: (evt: WireEvent, ctx: Ctx) => boolean,
  ) {}

  async init(): Promise<void> {
    const head = await this.store.head()
    if (head.ok) this.lastKnown = head.value
  }

  get headCursor(): number {
    return this.lastKnown
  }

  /**
   * Register a connection. Replays events after the client's cursor from the
   * durable log, then marks the connection live so pump() takes over.
   */
  async attach(sink: SseSink<Ctx>): Promise<void> {
    this.sinks.add(sink)
    // Catch up from the client's cursor until the log is drained.
    for (;;) {
      if (sink.closed) return
      const batch = await this.store.fetchEventsAfter(sink.cursor, 500)
      if (!batch.ok || batch.value.length === 0) break
      for (const evt of batch.value) this.deliver(sink, evt)
    }
    sink.live = true
  }

  detach(sink: SseSink<Ctx>): void {
    sink.closed = true
    this.sinks.delete(sink)
  }

  /** Wake-up: read new events from the log and broadcast to live sinks. */
  pump(): void {
    if (this.pumping) {
      this.pumpQueued = true
      return
    }
    this.pumping = true
    void this.drain().finally(() => {
      this.pumping = false
      if (this.pumpQueued) {
        this.pumpQueued = false
        this.pump()
      }
    })
  }

  private async drain(): Promise<void> {
    for (;;) {
      const batch = await this.store.fetchEventsAfter(this.lastKnown, 500)
      if (!batch.ok || batch.value.length === 0) return
      for (const evt of batch.value) {
        this.lastKnown = Math.max(this.lastKnown, evt.id)
        for (const sink of this.sinks) {
          if (sink.live) this.deliver(sink, evt)
        }
      }
    }
  }

  private deliver(sink: SseSink<Ctx>, evt: WireEvent): void {
    if (sink.closed || evt.id <= sink.cursor) return
    sink.cursor = evt.id
    if (!this.authorize(evt, sink.ctx)) return
    sink.write(formatSseEvent(evt))
  }

  closeAll(): void {
    for (const sink of this.sinks) sink.closed = true
    this.sinks.clear()
  }
}
