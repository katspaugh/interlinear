/**
 * Import suttas from SuttaCentral into the library.
 *
 *   pnpm import:suttas [--dry-run] [--force] <uid…>
 *
 * A uid may be a collection or branch (mn, dhp, sn-sagathavagga) — expanded
 * to its leaves via the suttaplex API — or a single sutta (mn1, snp1.8).
 * Each sutta is stored with its segmented Mahāsaṅgīti Pali root and Bhikkhu
 * Sujato's aligned translation, status 'unglossed': readable immediately,
 * word-glossed by the worker the first time somebody opens it.
 *
 * Existing slugs are left alone unless --force re-imports them (built-in
 * texts only). Needs DATABASE_URL (defaults to the local dev database); no
 * LLM key is required. On a running deployment, prefer the admin-only
 * `text.import` intent, which queues the same import through the worker.
 */

import pg from 'pg'
import { normalizeDatabaseUrl } from '../db.js'
import { expandUid, importSutta, type SuttaplexEntry } from './importer.js'

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')
  const uids = args.filter((arg) => !arg.startsWith('--'))
  if (uids.length === 0) {
    console.error(
      'usage: pnpm import:suttas [--dry-run] [--force] <uid…>\n' +
        '  e.g. pnpm import:suttas snp dhp mn1 mn2',
    )
    process.exit(1)
  }

  const connectionString =
    process.env.DATABASE_URL ?? 'postgres://dev:dev@localhost:5432/interlinear'
  const pool = new pg.Pool({
    connectionString: normalizeDatabaseUrl(connectionString),
  })

  const counts = { imported: 0, skipped: 0, failed: 0 }
  try {
    for (const uid of uids) {
      let leaves: SuttaplexEntry[]
      try {
        leaves = await expandUid(uid)
      } catch (cause) {
        console.warn(`[import] ${uid}: expansion failed — ${String(cause)}`)
        counts.failed += 1
        continue
      }
      if (leaves.length === 0) {
        console.warn(`[import] ${uid}: no suttas found`)
        continue
      }
      for (const leaf of leaves) {
        const result = await importSutta(pool, leaf, { dryRun, force })
        counts[result.outcome] += 1
      }
    }
  } finally {
    await pool.end()
  }

  console.log(
    `[import] done: ${counts.imported} imported, ${counts.skipped} skipped, ` +
      `${counts.failed} failed${dryRun ? ' (dry run)' : ''}`,
  )
  if (counts.failed > 0) process.exitCode = 1
}

await main()
