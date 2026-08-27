import crypto from 'node:crypto'

/**
 * Owner-token check for mutating intents. When ADMIN_TOKEN is configured,
 * text.add / text.remove require the matching x-admin-token header; when it
 * is not configured (local dev), everything stays open.
 */
export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN)
}

export function isAdminToken(header: string | undefined): boolean {
  const token = process.env.ADMIN_TOKEN
  if (!token) return true
  if (!header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(token)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
