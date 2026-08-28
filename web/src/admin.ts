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

/** True when the server requires an owner passphrase. The flag is injected
 * into index.html by the server (see server/src/static.ts); in dev, where
 * Vite serves the shell, it is absent and the instance behaves as open. */
export function isAdminLocked(): boolean {
  try {
    return document.querySelector('meta[name="admin-locked"]') !== null
  } catch {
    return false
  }
}

/** Whether to render owner-only UI (the add form, delete buttons). Open
 * instances show it to everyone; locked instances only when a passphrase is
 * stored in this browser — or when the owner knocks by visiting /#add.
 * Purely cosmetic: the server enforces the passphrase regardless. */
export function adminUiVisible(): boolean {
  return !isAdminLocked() || getAdminToken() !== null || window.location.hash === '#add'
}
