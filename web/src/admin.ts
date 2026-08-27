/**
 * The owner passphrase, remembered per browser. When present it is sent as
 * the x-admin-token header on every IntentEffect request (via the client's
 * `headers` option); the server only requires it for text.add / text.remove.
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

/** Per-request headers for the IntentEffect client. */
export function adminHeaders(): HeadersInit {
  const token = getAdminToken()
  return token ? { 'x-admin-token': token } : {}
}
