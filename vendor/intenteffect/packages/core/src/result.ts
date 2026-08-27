/**
 * Result<T, E> — the framework-wide way to represent fallible operations.
 * Expected failures (validation, authorization, transport, handler errors)
 * are values, not exceptions. Exceptions are reserved for programmer errors
 * (e.g. registering two handlers for one intent).
 */

export type Ok<T> = { readonly ok: true; readonly value: T }
export type Err<E> = { readonly ok: false; readonly error: E }
export type Result<T, E> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return !r.ok
}

export function map<T, E, U>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return r.ok ? ok(fn(r.value)) : r
}

export function mapErr<T, E, F>(r: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return r.ok ? r : err(fn(r.error))
}

export function andThen<T, E, U>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return r.ok ? fn(r.value) : r
}

export function unwrapOr<T, E>(r: Result<T, E>, fallback: T): T {
  return r.ok ? r.value : fallback
}

/** Convert a promise that may reject into a Promise<Result>. */
export async function fromPromise<T, E>(
  promise: Promise<T>,
  onError: (cause: unknown) => E,
): Promise<Result<T, E>> {
  try {
    return ok(await promise)
  } catch (cause) {
    return err(onError(cause))
  }
}

/** Run a function that may throw, capturing the outcome as a Result. */
export function fromThrowable<T, E>(
  fn: () => T,
  onError: (cause: unknown) => E,
): Result<T, E> {
  try {
    return ok(fn())
  } catch (cause) {
    return err(onError(cause))
  }
}
