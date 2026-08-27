export type IntentEffectErrorCode =
  | 'validation_failed'
  | 'unauthorized'
  | 'not_found'
  | 'handler_failed'
  | 'intent_conflict'
  | 'store_failed'
  | 'transport_failed'

export interface IntentEffectError {
  readonly code: IntentEffectErrorCode
  readonly message: string
  readonly details?: unknown
  /** True when this error was replayed from a previously recorded intent. */
  readonly deduped?: boolean
}

export function intentEffectError(
  code: IntentEffectErrorCode,
  message: string,
  details?: unknown,
): IntentEffectError {
  return details === undefined ? { code, message } : { code, message, details }
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

const STATUS_BY_CODE: Record<IntentEffectErrorCode, number> = {
  validation_failed: 400,
  unauthorized: 403,
  not_found: 404,
  handler_failed: 422,
  intent_conflict: 409,
  store_failed: 500,
  transport_failed: 502,
}

export function httpStatusFor(error: IntentEffectError): number {
  return STATUS_BY_CODE[error.code] ?? 500
}
