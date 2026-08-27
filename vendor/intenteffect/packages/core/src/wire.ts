import type { IntentEffectError } from './errors.js'

/** Default mount point for all IntentEffect HTTP endpoints. */
export const DEFAULT_BASE_PATH = '/_intenteffect'

export const SEND_PATH = '/send'
export const EVENTS_PATH = '/events'
export const PROJECTION_PATH = '/projection'

/**
 * A persisted, authoritative event as it travels over the wire —
 * both in `send()` HTTP responses and over the SSE stream.
 * `id` is the monotonically increasing global event cursor.
 */
export interface WireEvent {
  readonly id: number
  readonly type: string
  readonly data: unknown
  readonly intentId: string | null
  readonly correlationId: string | null
  readonly causationId: number | null
  readonly actorId: string | null
  readonly tenantId: string | null
  readonly createdAt: string
}

export interface SendRequestBody {
  readonly intentId: string
  readonly type: string
  readonly input: unknown
  readonly correlationId?: string
}

export interface SendOk {
  readonly intentId: string
  /** True when this intentId had already completed and the stored outcome was replayed. */
  readonly deduped: boolean
  readonly events: WireEvent[]
}

export interface ProjectionRequestBody {
  readonly name: string
  readonly params: unknown
}

export interface ProjectionOk {
  readonly result: unknown
  /**
   * Event cursor consistent with the snapshot: every event with id <= cursor
   * is already reflected in `result`; the client applies only events after it.
   */
  readonly cursor: number
}

/**
 * Results are serialized over the wire in their runtime shape:
 * `{ ok: true, value } | { ok: false, error }`.
 */
export type WireResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: IntentEffectError }
