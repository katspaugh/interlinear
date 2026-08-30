import crypto from 'node:crypto'
import type pg from 'pg'
import type { Word } from '@interlinear/shared'
import { SEED_TEXTS, type SeedChunk, type SeedText } from './seed-data.js'
import { CANON_SEED_TEXTS } from './seed-data-canon.js'
import { FICTION_SEED_TEXTS } from './seed-data-fiction.js'
import { MN_SEED_TEXTS } from './seed-data-mn.js'
import { CLASSIC_SEED_TEXTS } from './seed-data-classics.js'

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
  const all: SeedText[] = [...SEED_TEXTS, ...CANON_SEED_TEXTS, ...MN_SEED_TEXTS, ...FICTION_SEED_TEXTS, ...CLASSIC_SEED_TEXTS]
  for (const text of all) {
    const existing = await pool.query<{ id: string; status: string; chunks: number }>(
      `select t.id, t.status,
              (select count(*)::int from text_chunks c where c.text_id = t.id) as chunks
       from texts t where t.slug = $1`,
      [text.slug],
    )
    const row = existing.rows[0]
    if (row) {
      if (row.status === 'ready' && row.chunks === text.chunks.length) continue
      // An earlier deploy seeded this text without glosses (or its glossing
      // failed), or the built-in content changed shape (e.g. an excerpt
      // upgraded to the full text); replace it with the current pre-glossed
      // version. Chunks cascade.
      const deleted = await pool.query(
        `delete from texts where id = $1 and builtin = true`,
        [row.id],
      )
      if (deleted.rowCount === 0) continue // a user's text owns the slug
      console.log(`[seed] replacing stale "${text.title}" (${text.slug})`)
    }

    const id = crypto.randomUUID()
    await pool.query(
      `insert into texts (id, slug, title, orig_title, source, lang, kind, status, builtin, translator)
       values ($1, $2, $3, $4, $5, $6, $7, 'ready', true, $8)`,
      [id, text.slug, text.title, text.origTitle, text.source, text.lang, text.kind, text.translator ?? null],
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
}
