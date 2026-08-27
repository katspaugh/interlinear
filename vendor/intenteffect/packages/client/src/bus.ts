import {
  DEFAULT_BASE_PATH,
  EVENTS_PATH,
  type WireEvent,
} from '@intenteffect/core'

export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'reconnecting'

export interface EventSourceLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onopen: ((ev: any) => any) | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onmessage: ((ev: any) => any) | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((ev: any) => any) | null
  close(): void
}

export type EventSourceFactory = (url: string) => EventSourceLike

interface BusConfig {
  baseUrl: string
  basePath?: string
  eventSource?: EventSourceFactory
  reconnectDelayMs?: number
}

const MAX_APPLIED_SET = 10_000

/**
 * Single SSE connection per client, shared by all projections.
 *
 * Dedup model:
 * - `lastSseId` advances only with events received over SSE (a contiguous,
 *   ordered stream) and is the reconnect cursor.
 * - `applied` remembers every event id already delivered to listeners, so an
 *   event returned in a send() HTTP response and again over SSE (or replayed
 *   after reconnect) is applied exactly once.
 */
export class EventBus {
  status: ConnectionStatus = 'idle'
  private es: EventSourceLike | null = null
  private lastSseId = 0
  private everReceived = false
  private readonly applied = new Set<number>()
  private readonly listeners = new Set<(evt: WireEvent) => void>()
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = false

  constructor(private readonly config: BusConfig) {}

  start(): void {
    this.stopped = false
    if (this.es || this.reconnectTimer) return
    this.connect()
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.es?.close()
    this.es = null
    this.setStatus('idle')
  }

  onEvent(listener: (evt: WireEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /**
   * Deliver an event to listeners exactly once, no matter how many transports
   * carried it. Used for both SSE-received and HTTP-response events.
   */
  apply(evt: WireEvent): void {
    if (this.applied.has(evt.id)) return
    this.applied.add(evt.id)
    if (this.applied.size > MAX_APPLIED_SET) {
      // Sets iterate in insertion order: drop the oldest entries.
      const drop = this.applied.size - MAX_APPLIED_SET
      let dropped = 0
      for (const id of this.applied) {
        if (dropped++ >= drop) break
        this.applied.delete(id)
      }
    }
    for (const listener of this.listeners) listener(evt)
  }

  private connect(): void {
    // First connect starts "live-only": history is unnecessary before any
    // projection snapshot exists. Reconnects resume from the SSE cursor.
    const cursor = this.everReceived ? String(this.lastSseId) : 'now'
    const base = this.config.basePath ?? DEFAULT_BASE_PATH
    const url = `${this.config.baseUrl}${base}${EVENTS_PATH}?cursor=${cursor}`
    const factory =
      this.config.eventSource ??
      ((u: string) => new EventSource(u) as unknown as EventSourceLike)

    this.setStatus(this.everReceived ? 'reconnecting' : 'connecting')
    const es = factory(url)
    this.es = es
    es.onopen = () => this.setStatus('live')
    es.onmessage = (message) => {
      const evt = JSON.parse(message.data) as WireEvent
      this.everReceived = true
      if (evt.id > this.lastSseId) this.lastSseId = evt.id
      this.apply(evt)
    }
    es.onerror = () => {
      // Manage reconnection ourselves so the resume cursor survives cases the
      // native retry misses (server restarts, laptop sleep, dropped sockets).
      es.close()
      if (this.es !== es) return
      this.es = null
      if (this.stopped) return
      this.setStatus('reconnecting')
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
      }, this.config.reconnectDelayMs ?? 1000)
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }
}
