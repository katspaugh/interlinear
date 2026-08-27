/**
 * The owner passphrase, remembered per browser. When present it is sent as
 * the x-admin-token header on every IntentEffect request; the server only
 * requires it for text.add / text.remove.
 */

const KEY = 'interlinear.adminToken'

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string): void {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode etc. — the field value still works for this page */
  }
}

/** fetch wrapper for the IntentEffect client that attaches the passphrase. */
export function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = getAdminToken()
  if (!token) return fetch(input, init)
  const headers = new Headers(init?.headers)
  headers.set('x-admin-token', token)
  return fetch(input, { ...init, headers })
}
