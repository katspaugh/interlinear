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
 * LLM key is required.
 */

import crypto from 'node:crypto'
import pg from 'pg'
import { sourceForUid } from '@interlinear/shared'
import { normalizeDatabaseUrl } from '../db.js'
import { chunksFromBilara, rootTitle, type BilaraSutta } from './bilara.js'

const API = 'https://suttacentral.net/api'
const TRANSLATOR = 'Bhikkhu Sujato, SuttaCentral'
/** Pause between API requests — SuttaCentral is a nonprofit; be gentle. */
const FETCH_DELAY_MS = 250

/** Suttas already in the hand-glossed seed library under a friendlier slug —
 * skipped so the library doesn't show the same discourse twice. */
const SEEDED: Record<string, string> = {
  'snp1.8': 'metta-sutta',
  'snp2.4': 'mangala-sutta',
  mn10: 'satipatthana-sutta',
  mn21: 'kakacupama-sutta',
  mn118: 'anapanassati-sutta',
  'sn56.11': 'four-noble-truths',
  'ud1.10': 'bahiya',
}

interface SuttaplexEntry {
  uid: string
  type?: string
  original_title?: string | null
  translated_title?: string | null
  acronym?: string | null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson<T>(url: string): Promise<T> {
  await sleep(FETCH_DELAY_MS)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

/** Expand a uid to its leaf suttas (a leaf uid expands to itself). */
async function expand(uid: string): Promise<SuttaplexEntry[]> {
  const list = await fetchJson<SuttaplexEntry[]>(
    `${API}/suttaplex/${encodeURIComponent(uid)}?language=en`,
  )
  return list.filter((entry) => entry.type === 'leaf')
}

async function fetchSutta(uid: string): Promise<BilaraSutta> {
  return fetchJson<BilaraSutta>(
    `${API}/bilarasuttas/${encodeURIComponent(uid)}/sujato?lang=en`,
  )
}

async function importSutta(
  pool: pg.Pool,
  leaf: SuttaplexEntry,
  options: { dryRun: boolean; force: boolean },
): Promise<'imported' | 'skipped' | 'failed'> {
  const uid = leaf.uid
  const seeded = SEEDED[uid]
  if (seeded) {
    console.log(`[import] ${uid}: already in the seed library as "${seeded}"`)
    return 'skipped'
  }

  const existing = await pool.query<{ id: string; builtin: boolean }>(
    `select id, builtin from texts where slug = $1`,
    [uid],
  )
  if (existing.rows[0] && !options.force) {
    console.log(`[import] ${uid}: already imported`)
    return 'skipped'
  }
  if (existing.rows[0] && !existing.rows[0].builtin) {
    console.log(`[import] ${uid}: slug is taken by a user text — skipping`)
    return 'skipped'
  }

  let sutta: BilaraSutta
  try {
    sutta = await fetchSutta(uid)
  } catch (cause) {
    console.warn(`[import] ${uid}: fetch failed — ${String(cause)}`)
    return 'failed'
  }
  const chunks = chunksFromBilara(sutta)
  if (chunks.length === 0) {
    console.warn(`[import] ${uid}: no segments — skipping`)
    return 'skipped'
  }

  const origTitle = leaf.original_title?.trim() || rootTitle(sutta)
  const title = leaf.translated_title?.trim() || origTitle || uid
  const source = sourceForUid(uid) ?? leaf.acronym?.trim() ?? null
  const translated = chunks.some((chunk) => chunk.translation)

  if (options.dryRun) {
    console.log(
      `[import] ${uid}: would import "${title}" (${source ?? 'no source'}), ` +
        `${chunks.length} chunks${translated ? '' : ', no translation'}`,
    )
    return 'imported'
  }

  const client = await pool.connect()
  try {
    await client.query('begin')
    if (existing.rows[0]) {
      await client.query(`delete from texts where id = $1 and builtin = true`, [
        existing.rows[0].id,
      ])
    }
    const id = crypto.randomUUID()
    await client.query(
      `insert into texts (id, slug, title, orig_title, source, lang, kind,
                          status, builtin, translator)
       values ($1, $2, $3, $4, $5, 'Pali', 'sutta', 'unglossed', true, $6)`,
      [id, uid, title, origTitle, source, translated ? TRANSLATOR : null],
    )
    for (const [idx, chunk] of chunks.entries()) {
      await client.query(
        `insert into text_chunks (text_id, idx, original, translation)
         values ($1, $2, $3, $4)`,
        [id, idx, chunk.original, chunk.translation],
      )
    }
    await client.query('commit')
  } catch (cause) {
    await client.query('rollback')
    console.warn(`[import] ${uid}: insert failed — ${String(cause)}`)
    return 'failed'
  } finally {
    client.release()
  }

  console.log(`[import] ${uid}: "${title}" (${chunks.length} chunks)`)
  return 'imported'
}

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
        leaves = await expand(uid)
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
        counts[await importSutta(pool, leaf, { dryRun, force })] += 1
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
