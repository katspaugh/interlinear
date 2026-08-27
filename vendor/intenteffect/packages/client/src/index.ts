import {
  DEFAULT_BASE_PATH,
  PROJECTION_PATH,
  SEND_PATH,
  err,
  errorMessage,
  intentEffectError,
  ok,
  validate,
  type AnyEventContract,
  type AnyIntentContract,
  type AnyProjectionContract,
  type EventData,
  type IntentEffectError,
  type IntentInput,
  type ProjectionOk,
  type ProjectionResult,
  type Result,
  type SendOk,
  type SendRequestBody,
  type WireEvent,
  type WireResult,
} from '@intenteffect/core'
import { EventBus, type ConnectionStatus, type EventSourceFactory } from './bus.js'
import { ProjectionStore, type ProjectionSnapshot } from './projection-store.js'

export type { ConnectionStatus, EventSourceFactory } from './bus.js'
export type { ProjectionSnapshot } from './projection-store.js'

export interface ClientConfig {
  /** Origin prefix, e.g. "" (same origin) or "http://localhost:3001". */
  baseUrl?: string
  basePath?: string
  fetchImpl?: typeof fetch
  eventSource?: EventSourceFactory
  /** Transport-level retries for send(); safe because intentId is idempotent. */
  sendRetries?: number
  reconnectDelayMs?: number
}

export interface SendOptions {
  /** Supply your own id to make retries across page loads idempotent. */
  intentId?: string
  correlationId?: string
}

export interface ProjectionHandle<T> {
  subscribe(onChange: () => void): () => void
  getSnapshot(): ProjectionSnapshot<T>
}

const DISPOSE_LINGER_MS = 5_000

export class IntentEffectClient {
  private readonly bus: EventBus
  private readonly baseUrl: string
  private readonly basePath: string
  private readonly fetchImpl: typeof fetch
  private readonly sendRetries: number
  private readonly projectionStores = new Map<
    string,
    { store: ProjectionStore<unknown>; disposeTimer: ReturnType<typeof setTimeout> | null }
  >()

  constructor(config: ClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? ''
    this.basePath = config.basePath ?? DEFAULT_BASE_PATH
    this.fetchImpl = config.fetchImpl ?? ((...args) => fetch(...args))
    this.sendRetries = config.sendRetries ?? 2
    this.bus = new EventBus({
      baseUrl: this.baseUrl,
      basePath: this.basePath,
      eventSource: config.eventSource,
      reconnectDelayMs: config.reconnectDelayMs,
    })
  }

  /* ---------------- imperative control flow ---------------- */

  /**
   * "Please make X happen." Resolves once the server has committed the
   * intent and returns the authoritative events it produced.
   */
  async send<I extends AnyIntentContract>(
    contract: I,
    input: IntentInput<I>,
    options: SendOptions = {},
  ): Promise<Result<SendOk, IntentEffectError>> {
    const parsed = validate(contract.input, input, `intent "${contract.type}" input`)
    if (!parsed.ok) return parsed

    const body: SendRequestBody = {
      intentId: options.intentId ?? crypto.randomUUID(),
      type: contract.type,
      input: parsed.value,
      correlationId: options.correlationId,
    }

    this.bus.start()

    let lastError = intentEffectError('transport_failed', 'send failed')
    for (let attempt = 0; attempt <= this.sendRetries; attempt++) {
      const result = await this.postJson<SendOk>(SEND_PATH, body)
      if (result.ok) {
        // Apply returned events immediately (the bus dedupes the SSE copies).
        for (const evt of result.value.events) this.bus.apply(evt)
        return result
      }
      lastError = result.error
      // Only transport failures are retried — the intentId makes this safe.
      if (result.error.code !== 'transport_failed') return result
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    }
    return err(lastError)
  }

  /* ---------------- synchronized state ---------------- */

  projection<P extends AnyProjectionContract>(
    contract: P,
    params: unknown = {},
  ): ProjectionHandle<ProjectionResult<P>> {
    const key = `${contract.name}:${stableStringify(params)}`
    let entry = this.projectionStores.get(key)
    if (!entry) {
      const store = new ProjectionStore<ProjectionResult<P>>(
        contract,
        params,
        this.bus,
        () => this.postJson<ProjectionOk>(PROJECTION_PATH, { name: contract.name, params }),
      )
      entry = { store: store as ProjectionStore<unknown>, disposeTimer: null }
      this.projectionStores.set(key, entry)
    }
    if (entry.disposeTimer) {
      clearTimeout(entry.disposeTimer)
      entry.disposeTimer = null
    }
    const store = entry.store as ProjectionStore<ProjectionResult<P>>
    return {
      getSnapshot: store.getSnapshot,
      subscribe: (onChange) => {
        const unsubscribe = store.subscribe(onChange)
        return () => {
          unsubscribe()
          this.scheduleDispose(key)
        }
      },
    }
  }

  /** Subscribe to a specific authoritative event type. */
  on<E extends AnyEventContract>(
    contract: E,
    listener: (data: EventData<E>, evt: WireEvent) => void,
  ): () => void {
    this.bus.start()
    return this.bus.onEvent((evt) => {
      if (evt.type === contract.type) listener(evt.data as EventData<E>, evt)
    })
  }

  /* ---------------- connection ---------------- */

  get connectionStatus(): ConnectionStatus {
    return this.bus.status
  }

  onConnectionStatus(listener: (status: ConnectionStatus) => void): () => void {
    return this.bus.onStatus(listener)
  }

  connect(): void {
    this.bus.start()
  }

  close(): void {
    this.bus.stop()
    for (const [key, entry] of this.projectionStores) {
      if (entry.disposeTimer) clearTimeout(entry.disposeTimer)
      entry.store.dispose()
      this.projectionStores.delete(key)
    }
  }

  /* ---------------- internals ---------------- */

  private scheduleDispose(key: string): void {
    const entry = this.projectionStores.get(key)
    if (!entry || entry.store.hasSubscribers || entry.disposeTimer) return
    entry.disposeTimer = setTimeout(() => {
      const current = this.projectionStores.get(key)
      if (current && !current.store.hasSubscribers) {
        current.store.dispose()
        this.projectionStores.delete(key)
      }
    }, DISPOSE_LINGER_MS)
  }

  private async postJson<T>(
    path: string,
    body: unknown,
  ): Promise<Result<T, IntentEffectError>> {
    let response: Response
    try {
      response = await this.fetchImpl(`${this.baseUrl}${this.basePath}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (cause) {
      return err(intentEffectError('transport_failed', errorMessage(cause)))
    }
    let wire: WireResult<T>
    try {
      wire = (await response.json()) as WireResult<T>
    } catch (cause) {
      return err(
        intentEffectError(
          'transport_failed',
          `invalid response (${response.status}): ${errorMessage(cause)}`,
        ),
      )
    }
    return wire.ok ? ok(wire.value) : err(wire.error)
  }
}

export function createClient(config: ClientConfig = {}): IntentEffectClient {
  return new IntentEffectClient(config)
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(',')}}`
}
