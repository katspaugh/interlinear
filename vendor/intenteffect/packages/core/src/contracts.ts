import { z } from 'zod'
import { err, ok, type Result } from './result.js'
import { intentEffectError, type IntentEffectError } from './errors.js'

/* ------------------------------------------------------------------ */
/* Events: "X happened." Only the server may emit them.                */
/* ------------------------------------------------------------------ */

export interface EventContract<
  TType extends string = string,
  TSchema extends z.ZodType = z.ZodType,
> {
  readonly kind: 'event'
  readonly type: TType
  readonly data: TSchema
}

export type AnyEventContract = EventContract<string, z.ZodType>
export type EventData<E extends AnyEventContract> = z.output<E['data']>

export function event<TType extends string, TSchema extends z.ZodType>(
  type: TType,
  data: TSchema,
): EventContract<TType, TSchema>
export function event<TType extends string, TSchema extends z.ZodType>(def: {
  type: TType
  data: TSchema
}): EventContract<TType, TSchema>
export function event(
  typeOrDef: string | { type: string; data: z.ZodType },
  maybeData?: z.ZodType,
): AnyEventContract {
  const def =
    typeof typeOrDef === 'string'
      ? { type: typeOrDef, data: maybeData! }
      : typeOrDef
  return { kind: 'event', type: def.type, data: def.data }
}

/* ------------------------------------------------------------------ */
/* Intents: "Please make X happen." Sent by clients, decided by the    */
/* server, which emits authoritative events as consequences.           */
/* ------------------------------------------------------------------ */

export interface IntentContract<
  TType extends string = string,
  TSchema extends z.ZodType = z.ZodType,
> {
  readonly kind: 'intent'
  readonly type: TType
  readonly input: TSchema
  /** Events this intent is allowed to emit. Enforced by the server runtime. */
  readonly emits: readonly AnyEventContract[]
}

export type AnyIntentContract = IntentContract<string, z.ZodType>
export type IntentInput<I extends AnyIntentContract> = z.input<I['input']>

export function intent<TType extends string, TSchema extends z.ZodType>(
  type: TType,
  input: TSchema,
  opts?: { emits?: readonly AnyEventContract[] },
): IntentContract<TType, TSchema>
export function intent<TType extends string, TSchema extends z.ZodType>(def: {
  type: TType
  input: TSchema
  emits?: readonly AnyEventContract[]
}): IntentContract<TType, TSchema>
export function intent(
  typeOrDef: string | { type: string; input: z.ZodType; emits?: readonly AnyEventContract[] },
  maybeInput?: z.ZodType,
  opts?: { emits?: readonly AnyEventContract[] },
): AnyIntentContract {
  const def =
    typeof typeOrDef === 'string'
      ? { type: typeOrDef, input: maybeInput!, emits: opts?.emits }
      : typeOrDef
  return { kind: 'intent', type: def.type, input: def.input, emits: def.emits ?? [] }
}

/* ------------------------------------------------------------------ */
/* Projections: "Give me this view of current state and keep it        */
/* synchronized." The reducers are pure and shared: the server serves  */
/* a consistent snapshot + cursor, the client applies later events.    */
/* ------------------------------------------------------------------ */

export type ProjectionReducer<TState, TData, TParams> = (
  state: TState,
  data: TData,
  params: TParams,
) => TState

export interface ProjectionContract<
  TParams extends z.ZodType = z.ZodType,
  TResult extends z.ZodType = z.ZodType,
> {
  readonly kind: 'projection'
  readonly name: string
  readonly params: TParams
  readonly result: TResult
  readonly reducers: Record<
    string,
    ProjectionReducer<z.output<TResult>, unknown, z.output<TParams>>
  >
  /** Register a pure reducer describing how an event changes this view. */
  on<E extends AnyEventContract>(
    evt: E,
    reduce: ProjectionReducer<z.output<TResult>, EventData<E>, z.output<TParams>>,
  ): ProjectionContract<TParams, TResult>
}

export type AnyProjectionContract = ProjectionContract<z.ZodType, z.ZodType>
export type ProjectionParams<P extends AnyProjectionContract> = z.input<P['params']>
export type ProjectionResult<P extends AnyProjectionContract> = z.output<P['result']>

const EMPTY_PARAMS = z.object({})

export function projection<
  TResult extends z.ZodType,
  TParams extends z.ZodType = typeof EMPTY_PARAMS,
>(def: {
  name: string
  result: TResult
  params?: TParams
}): ProjectionContract<TParams, TResult> {
  const contract: ProjectionContract<TParams, TResult> = {
    kind: 'projection',
    name: def.name,
    params: (def.params ?? EMPTY_PARAMS) as TParams,
    result: def.result,
    reducers: {},
    on(evt, reduce) {
      if (contract.reducers[evt.type]) {
        throw new Error(
          `projection "${def.name}" already has a reducer for event "${evt.type}"`,
        )
      }
      contract.reducers[evt.type] = reduce as ProjectionReducer<
        z.output<TResult>,
        unknown,
        z.output<TParams>
      >
      return contract
    },
  }
  return contract
}

/* ------------------------------------------------------------------ */
/* Validation helper shared by client and server.                      */
/* ------------------------------------------------------------------ */

export function validate<S extends z.ZodType>(
  schema: S,
  value: unknown,
  what: string,
): Result<z.output<S>, IntentEffectError> {
  const parsed = schema.safeParse(value)
  return parsed.success
    ? ok(parsed.data)
    : err(
        intentEffectError('validation_failed', `invalid ${what}`, parsed.error.issues),
      )
}
