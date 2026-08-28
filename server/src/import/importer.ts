/**
 * SuttaCentral import core, shared by the CLI (cli.ts) and the server's
 * background worker (worker.ts, via the admin-only `text.import` intent).
 * Fetches a sutta's segmented Pali + Sujato translation and inserts it as an
 * 'unglossed' built-in text; see bilara.ts for the pure transforms.
 */

import crypto from 'node:crypto'
import type pg from 'pg'
import { sourceForUid } from '@interlinear/shared'
import { chunksFromBilara, rootTitle, type BilaraSutta } from './bilara.js'

const API = 'https://suttacentral.net/api'
const TRANSLATOR = 'Bhikkhu Sujato, SuttaCentral'
/** Pause before each API request — SuttaCentral is a nonprofit; be gentle. */
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

export interface SuttaplexEntry {
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
export async function expandUid(uid: string): Promise<SuttaplexEntry[]> {
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

export interface ImportResult {
  outcome: 'imported' | 'skipped' | 'failed'
  /** The inserted text's id, present only when outcome is 'imported'. */
  id?: string
  error?: string
}

export async function importSutta(
  pool: pg.Pool,
  leaf: SuttaplexEntry,
  options: { dryRun: boolean; force: boolean },
): Promise<ImportResult> {
  const uid = leaf.uid
  const seeded = SEEDED[uid]
  if (seeded) {
    console.log(`[import] ${uid}: already in the seed library as "${seeded}"`)
    return { outcome: 'skipped' }
  }

  const existing = await pool.query<{ id: string; builtin: boolean }>(
    `select id, builtin from texts where slug = $1`,
    [uid],
  )
  if (existing.rows[0] && !options.force) {
    console.log(`[import] ${uid}: already imported`)
    return { outcome: 'skipped' }
  }
  if (existing.rows[0] && !existing.rows[0].builtin) {
    console.log(`[import] ${uid}: slug is taken by a user text — skipping`)
    return { outcome: 'skipped' }
  }

  let sutta: BilaraSutta
  try {
    sutta = await fetchSutta(uid)
  } catch (cause) {
    const error = `fetch failed — ${String(cause)}`
    console.warn(`[import] ${uid}: ${error}`)
    return { outcome: 'failed', error }
  }
  const chunks = chunksFromBilara(sutta)
  if (chunks.length === 0) {
    console.warn(`[import] ${uid}: no segments — skipping`)
    return { outcome: 'skipped' }
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
    return { outcome: 'imported' }
  }

  const id = crypto.randomUUID()
  const client = await pool.connect()
  try {
    await client.query('begin')
    if (existing.rows[0]) {
      await client.query(`delete from texts where id = $1 and builtin = true`, [
        existing.rows[0].id,
      ])
    }
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
    const error = `insert failed — ${String(cause)}`
    console.warn(`[import] ${uid}: ${error}`)
    return { outcome: 'failed', error }
  } finally {
    client.release()
  }

  console.log(`[import] ${uid}: "${title}" (${chunks.length} chunks)`)
  return { outcome: 'imported', id }
}
