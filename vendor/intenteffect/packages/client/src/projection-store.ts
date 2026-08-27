import type {
  AnyProjectionContract,
  IntentEffectError,
  ProjectionOk,
  Result,
  WireEvent,
} from '@intenteffect/core'
import type { EventBus } from './bus.js'

export type ProjectionSnapshot<T> =
  | { readonly status: 'loading'; readonly data?: undefined; readonly error?: undefined }
  | { readonly status: 'ready'; readonly data: T; readonly error?: undefined }
  | { readonly status: 'error'; readonly data?: undefined; readonly error: IntentEffectError }

/**
 * Client-side synchronized view: fetches the server snapshot (+ cursor),
 * then applies the contract's pure reducers to events arriving on the bus.
 *
 * Correctness relies on two invariants:
 * - the bus delivers each event at most once (global dedup), and
 * - the snapshot cursor is consistent, so exactly the events with
 *   id > cursor are applied on top of it.
 */
export class ProjectionStore<T> {
  private snapshot: ProjectionSnapshot<T> = { status: 'loading' }
  private cursor = -1
  private readonly pendingEvents: WireEvent[] = []
  private readonly subscribers = new Set<() => void>()
  private unsubscribeBus: (() => void) | null = null
  private loading = false

  constructor(
    private readonly contract: AnyProjectionContract,
    private readonly params: unknown,
    private readonly bus: EventBus,
    private readonly fetchSnapshot: () => Promise<Result<ProjectionOk, IntentEffectError>>,
  ) {}

  getSnapshot = (): ProjectionSnapshot<T> => this.snapshot

  subscribe = (onChange: () => void): (() => void) => {
    this.subscribers.add(onChange)
    this.ensureStarted()
    return () => {
      this.subscribers.delete(onChange)
    }
  }

  get hasSubscribers(): boolean {
    return this.subscribers.size > 0
  }

  dispose(): void {
    this.unsubscribeBus?.()
    this.unsubscribeBus = null
    this.subscribers.clear()
  }

  private ensureStarted(): void {
    if (this.unsubscribeBus) return
    // Subscribe to the bus BEFORE fetching: events arriving during the fetch
    // are buffered and replayed against the snapshot cursor afterwards.
    this.bus.start()
    this.unsubscribeBus = this.bus.onEvent((evt) => this.onEvent(evt))
    void this.load()
  }

  private async load(): Promise<void> {
    if (this.loading) return
    this.loading = true
    const fetched = await this.fetchSnapshot()
    this.loading = false
    if (!fetched.ok) {
      this.snapshot = { status: 'error', error: fetched.error }
      this.notify()
      return
    }
    this.cursor = fetched.value.cursor
    let data = fetched.value.result as T
    for (const evt of this.pendingEvents.splice(0)) {
      data = this.reduce(data, evt)
    }
    this.snapshot = { status: 'ready', data }
    this.notify()
  }

  private onEvent(evt: WireEvent): void {
    if (this.snapshot.status !== 'ready') {
      this.pendingEvents.push(evt)
      return
    }
    const next = this.reduce(this.snapshot.data, evt)
    if (next !== this.snapshot.data) {
      this.snapshot = { status: 'ready', data: next }
      this.notify()
    }
  }

  private reduce(data: T, evt: WireEvent): T {
    if (evt.id <= this.cursor) return data // already contained in the snapshot
    const reducer = this.contract.reducers[evt.type]
    if (!reducer) return data
    return reducer(data, evt.data, this.params) as T
  }

  private notify(): void {
    for (const onChange of this.subscribers) onChange()
  }
}
