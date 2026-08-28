import crypto from 'node:crypto'
import type pg from 'pg'
import { splitChunks, type Word } from '@interlinear/shared'
import { glossAvailable } from './llm.js'
import { SEED_TEXTS, type SeedChunk } from './seed-data.js'
import { RAW_SEED_TEXTS } from './seed-data-raw.js'

function chunkWords(chunk: SeedChunk): Word[] {
  return chunk.lines.flatMap((line, lineIdx) =>
    line.map(([w, g], wordIdx) => {
      const isLineEnd =
        wordIdx === line.length - 1 && lineIdx < chunk.lines.length - 1
      return isLineEnd ? { w, g, nl: true } : { w, g }
    }),
  )
}

function chunkOriginal(chunk: SeedChunk): string {
  return chunk.lines.map((line) => line.map(([w]) => w).join(' ')).join('\n')
}

/** Insert the built-in sample texts if they aren't in the database yet.
 * Runs at boot, before any client is connected, so it writes directly —
 * no events need to be emitted. */
export async function seed(pool: pg.Pool): Promise<void> {
  for (const text of SEED_TEXTS) {
    const existing = await pool.query(`select 1 from texts where slug = $1`, [
      text.slug,
    ])
    if ((existing.rowCount ?? 0) > 0) continue

    const id = crypto.randomUUID()
    await pool.query(
      `insert into texts (id, slug, title, orig_title, source, lang, kind, status, builtin)
       values ($1, $2, $3, $4, $5, $6, $7, 'ready', true)`,
      [id, text.slug, text.title, text.origTitle, text.source, text.lang, text.kind],
    )
    for (const [idx, chunk] of text.chunks.entries()) {
      await pool.query(
        `insert into text_chunks (text_id, idx, original, words, translation)
         values ($1, $2, $3, $4, $5)`,
        [id, idx, chunkOriginal(chunk), JSON.stringify(chunkWords(chunk)), chunk.translation],
      )
    }
    console.log(`[seed] added "${text.title}" (${text.slug})`)
  }

  // Raw (unglossed) seeds go in as 'glossing' and are picked up by the
  // gloss worker. Without a gloss key the worker would only mark them
  // failed, so they wait for a boot that can actually gloss them.
  if (!glossAvailable()) {
    console.log('[seed] no gloss API key — skipping raw seed texts')
    return
  }
  for (const text of RAW_SEED_TEXTS) {
    const existing = await pool.query(`select 1 from texts where slug = $1`, [
      text.slug,
    ])
    if ((existing.rowCount ?? 0) > 0) continue

    const id = crypto.randomUUID()
    await pool.query(
      `insert into texts (id, slug, title, orig_title, source, lang, kind, status, builtin)
       values ($1, $2, $3, $4, $5, $6, $7, 'glossing', true)`,
      [id, text.slug, text.title, text.origTitle, text.source, text.lang, text.kind],
    )
    for (const [idx, original] of splitChunks(text.text).entries()) {
      await pool.query(
        `insert into text_chunks (text_id, idx, original) values ($1, $2, $3)`,
        [id, idx, original],
      )
    }
    console.log(`[seed] added "${text.title}" (${text.slug}) — queued for glossing`)
  }
}
