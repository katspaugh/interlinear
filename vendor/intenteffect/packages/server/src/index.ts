import http from 'node:http'
import { z } from 'zod'
import {
  DEFAULT_BASE_PATH,
  EVENTS_PATH,
  PROJECTION_PATH,
  SEND_PATH,
  err,
  errorMessage,
  httpStatusFor,
  intentEffectError,
  ok,
  validate,
  type AnyEventContract,
  type AnyIntentContract,
  type AnyProjectionContract,
  type EventData,
  type IntentEffectError,
  type ProjectionOk,
  type Result,
  type SendOk,
  type WireEvent,
  type WireResult,
} from '@intenteffect/core'
import { EventHub, type SseSink } from './hub.js'
import type { EventStore, IntentRun, NewEventRecord } from './store.js'

export * from './store.js'
export { EventHub, formatSseEvent } from './hub.js'

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export interface IntentEffectConfig<Ctx, Tx> {
  store: EventStore
  /** Build a per-request context (auth, session, ...). Defaults to {}. */
  context?: (req: http.IncomingMessage) => Ctx | Promise<Ctx>
  /** Extract actor/tenant identity persisted with intents and events. */
  identify?: (ctx: Ctx) => { actorId?: string | null; tenantId?: string | null }
  /** Map the store's raw transaction handle to the app-facing tx. */
  tx?: (raw: unknown) => Tx
  /**
   * Event visibility: decides per connection whether an event is delivered.
   * Defaults to broadcasting everything (fine for the demo, replace in apps).
   */
  authorizeEvent?: (evt: WireEvent, ctx: Ctx) => boolean
  /** Authorize an intent before its handler runs. */
  authorizeIntent?: (
    intent: AnyIntentContract,
    input: unknown,
    ctx: Ctx,
  ) => Result<void, IntentEffectError> | Promise<Result<void, IntentEffectError>>
  basePath?: string
  heartbeatMs?: number
}

export interface HandlerArgs<I extends AnyIntentContract, Ctx, Tx> {
  input: z.output<I['input']>
  ctx: Ctx
  tx: Tx
  intentId: string
  emit: <E extends AnyEventContract>(evt: E, data: EventData<E>) => void
}

export type IntentHandler<I extends AnyIntentContract, Ctx, Tx> = (
  args: HandlerArgs<I, Ctx, Tx>,
) => Promise<void | Result<unknown, IntentEffectError>>

export interface ProjectionQueryArgs<P extends AnyProjectionContract, Ctx, Tx> {
  params: z.output<P['params']>
  ctx: Ctx
  tx: Tx
}

export interface ProjectionDefinition<P extends AnyProjectionContract, Ctx, Tx> {
  query: (args: ProjectionQueryArgs<P, Ctx, Tx>) => Promise<z.output<P['result']>>
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const sendBodySchema = z.object({
  intentId: z.string().min(8),
  type: z.string(),
  input: z.unknown(),
  correlationId: z.string().optional(),
})

const projectionBodySchema = z.object({
  name: z.string(),
  params: z.unknown(),
})

export class IntentEffectServer<Ctx, Tx> {
  private readonly handlers = new Map<
    string,
    { contract: AnyIntentContract; handler: IntentHandler<AnyIntentContract, Ctx, Tx> }
  >()
  private readonly projections = new Map<
    string,
    {
      contract: AnyProjectionContract
      definition: ProjectionDefinition<AnyProjectionContract, Ctx, Tx>
    }
  >()
  private readonly hub: EventHub<Ctx>
  private readonly basePath: string
  private readonly heartbeatMs: number
  private unsubscribe: (() => void) | null = null
  private started = false

  constructor(private readonly config: IntentEffectConfig<Ctx, Tx>) {
    this.basePath = config.basePath ?? DEFAULT_BASE_PATH
    this.heartbeatMs = config.heartbeatMs ?? 15_000
    this.hub = new EventHub(config.store, config.authorizeEvent ?? (() => true))
  }

  /* ---------------- registration ---------------- */

  handle<I extends AnyIntentContract>(
    contract: I,
    handler: IntentHandler<I, Ctx, Tx>,
  ): this {
    if (this.handlers.has(contract.type)) {
      throw new Error(`intent "${contract.type}" already has a handler`)
    }
    this.handlers.set(contract.type, {
      contract,
      handler: handler as IntentHandler<AnyIntentContract, Ctx, Tx>,
    })
    return this
  }

  project<P extends AnyProjectionContract>(
    contract: P,
    definition: ProjectionDefinition<P, Ctx, Tx>,
  ): this {
    if (this.projections.has(contract.name)) {
      throw new Error(`projection "${contract.name}" already defined`)
    }
    this.projections.set(contract.name, {
      contract,
      definition: definition as ProjectionDefinition<AnyProjectionContract, Ctx, Tx>,
    })
    return this
  }

  /* ---------------- lifecycle ---------------- */

  async start(): Promise<void> {
    if (this.started) return
    this.started = true
    await this.hub.init()
    this.unsubscribe = this.config.store.subscribe(() => this.hub.pump())
  }

  async close(): Promise<void> {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.hub.closeAll()
    await this.config.store.close()
    this.started = false
  }

  async listen(port: number, host = '0.0.0.0'): Promise<http.Server> {
    await this.start()
    const server = http.createServer((req, res) => this.nodeHandler(req, res))
    await new Promise<void>((resolve) => server.listen(port, host, resolve))
    return server
  }

  /* ---------------- core operations (transport-independent) -------- */

  async executeSend(
    body: unknown,
    ctx: Ctx,
  ): Promise<Result<SendOk, IntentEffectError>> {
    const parsedBody = validate(sendBodySchema, body, 'send request')
    if (!parsedBody.ok) return parsedBody
    const { intentId, type, input, correlationId } = parsedBody.value

    const registration = this.handlers.get(type)
    if (!registration) {
      return err(intentEffectError('not_found', `no handler for intent "${type}"`))
    }
    const { contract, handler } = registration

    const parsedInput = validate(contract.input, input, `intent "${type}" input`)
    if (!parsedInput.ok) return parsedInput

    if (this.config.authorizeIntent) {
      const authorized = await this.config.authorizeIntent(contract, parsedInput.value, ctx)
      if (!authorized.ok) return authorized
    }

    const identity = this.config.identify?.(ctx) ?? {}
    const allowedEvents = new Set(contract.emits.map((e) => e.type))

    const run: IntentRun = async (rawTx) => {
      const emitted: NewEventRecord[] = []
      let emitError: IntentEffectError | null = null
      const emit = (evt: AnyEventContract, data: unknown) => {
        if (allowedEvents.size > 0 && !allowedEvents.has(evt.type)) {
          emitError ??= intentEffectError(
            'handler_failed',
            `intent "${type}" emitted undeclared event "${evt.type}" — add it to the intent's emits list`,
          )
          return
        }
        const parsed = validate(evt.data, data, `event "${evt.type}" data`)
        if (!parsed.ok) {
          emitError ??= parsed.error
          return
        }
        emitted.push({ type: evt.type, data: parsed.value })
      }

      try {
        const outcome = await handler({
          input: parsedInput.value,
          ctx,
          tx: this.mapTx(rawTx),
          intentId,
          emit,
        })
        if (emitError) return err(emitError)
        if (outcome && typeof outcome === 'object' && 'ok' in outcome && !outcome.ok) {
          return err(outcome.error)
        }
        return ok(emitted)
      } catch (cause) {
        return err(intentEffectError('handler_failed', errorMessage(cause)))
      }
    }

    const executed = await this.config.store.executeIntent(
      {
        intentId,
        type,
        actorId: identity.actorId ?? null,
        tenantId: identity.tenantId ?? null,
        correlationId: correlationId ?? intentId,
      },
      run,
    )
    if (!executed.ok) return executed

    // Low-latency local fan-out; NOTIFY covers other server processes.
    this.hub.pump()

    return ok({
      intentId,
      deduped: executed.value.deduped,
      events: executed.value.events,
    })
  }

  async executeProjection(
    body: unknown,
    ctx: Ctx,
  ): Promise<Result<ProjectionOk, IntentEffectError>> {
    const parsedBody = validate(projectionBodySchema, body, 'projection request')
    if (!parsedBody.ok) return parsedBody

    const registration = this.projections.get(parsedBody.value.name)
    if (!registration) {
      return err(
        intentEffectError('not_found', `no projection named "${parsedBody.value.name}"`),
      )
    }
    const { contract, definition } = registration

    const params = validate(
      contract.params,
      parsedBody.value.params ?? {},
      `projection "${contract.name}" params`,
    )
    if (!params.ok) return params

    const snapshot = await this.config.store.snapshotProjection((rawTx) =>
      definition.query({ params: params.value, ctx, tx: this.mapTx(rawTx) }),
    )
    if (!snapshot.ok) return snapshot

    const result = validate(
      contract.result,
      snapshot.value.result,
      `projection "${contract.name}" result`,
    )
    if (!result.ok) return result

    return ok({ result: result.value, cursor: snapshot.value.cursor })
  }

  /* ---------------- HTTP transport ---------------- */

  nodeHandler = (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next?: () => void,
  ): void => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith(this.basePath)) {
      if (next) return next()
      res.writeHead(404).end()
      return
    }
    const route = url.pathname.slice(this.basePath.length) || '/'
    void this.route(route, url, req, res).catch((cause) => {
      if (!res.headersSent) {
        writeJson(res, 500, {
          ok: false,
          error: intentEffectError('store_failed', errorMessage(cause)),
        })
      } else {
        res.end()
      }
    })
  }

  private async route(
    route: string,
    url: URL,
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    await this.start()
    const ctx = ((await this.config.context?.(req)) ?? {}) as Ctx

    if (route === SEND_PATH && req.method === 'POST') {
      const body = await readJsonBody(req)
      if (!body.ok) return writeResult(res, body)
      return writeResult(res, await this.executeSend(body.value, ctx))
    }

    if (route === PROJECTION_PATH && req.method === 'POST') {
      const body = await readJsonBody(req)
      if (!body.ok) return writeResult(res, body)
      return writeResult(res, await this.executeProjection(body.value, ctx))
    }

    if (route === EVENTS_PATH && req.method === 'GET') {
      return this.serveEvents(url, req, res, ctx)
    }

    res.writeHead(404).end()
  }

  private async serveEvents(
    url: URL,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    ctx: Ctx,
  ): Promise<void> {
    // Reconnects send Last-Event-ID; first connects pass ?cursor=<n|now>.
    const lastEventIdHeader = req.headers['last-event-id']
    const lastEventId = Array.isArray(lastEventIdHeader)
      ? lastEventIdHeader[0]
      : lastEventIdHeader
    const cursorParam = lastEventId ?? url.searchParams.get('cursor') ?? 'now'
    const cursor =
      cursorParam === 'now' ? this.hub.headCursor : Number.parseInt(cursorParam, 10)
    if (!Number.isFinite(cursor) || cursor < 0) {
      res.writeHead(400).end()
      return
    }

    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    })
    res.write(`retry: 2000\n\n`)

    const sink: SseSink<Ctx> = {
      ctx,
      cursor,
      live: false,
      closed: false,
      write: (chunk) => {
        if (!sink.closed) res.write(chunk)
      },
    }

    const heartbeat = setInterval(() => sink.write(`: ping\n\n`), this.heartbeatMs)
    req.on('close', () => {
      clearInterval(heartbeat)
      this.hub.detach(sink)
      res.end()
    })

    await this.hub.attach(sink)
  }

  private mapTx(raw: unknown): Tx {
    return this.config.tx ? this.config.tx(raw) : (raw as Tx)
  }
}

export function createIntentEffect<Ctx = Record<string, never>, Tx = unknown>(
  config: IntentEffectConfig<Ctx, Tx>,
): IntentEffectServer<Ctx, Tx> {
  return new IntentEffectServer(config)
}

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

async function readJsonBody(
  req: http.IncomingMessage,
): Promise<Result<unknown, IntentEffectError>> {
  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8')
    return ok(raw.length === 0 ? undefined : JSON.parse(raw))
  } catch (cause) {
    return err(
      intentEffectError('validation_failed', `invalid JSON body: ${errorMessage(cause)}`),
    )
  }
}

function writeJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

function writeResult<T>(
  res: http.ServerResponse,
  result: Result<T, IntentEffectError>,
): void {
  const body: WireResult<T> = result.ok
    ? { ok: true, value: result.value }
    : { ok: false, error: result.error }
  writeJson(res, result.ok ? 200 : httpStatusFor(result.error), body)
}
