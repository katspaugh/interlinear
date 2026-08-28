import crypto from 'node:crypto'
import type pg from 'pg'
import { err, intentEffectError } from '@intenteffect/core'
import { createIntentEffect, type IntentEffectServer } from '@intenteffect/server'
import { createPostgresStore, type PostgresStore } from '@intenteffect/postgres'
import {
  INTERNAL_INTENTS,
  addText,
  announceText,
  defineWord,
  importTexts,
  markGlossFailed,
  normalizeWord,
  removeText,
  requestGloss,
  saveChunkGloss,
  saveDefinition,
  slugify,
  splitChunks,
  textAdded,
  textChunkGlossed,
  textDetail,
  textGlossFailed,
  textGlossQueued,
  textImportQueued,
  textLibrary,
  textRemoved,
  wordDefined,
  wordDefinition,
  wordDefinitionFailed,
  wordDefinitionRequested,
  PREVIEW_WORDS,
  type TextStatus,
  type TextSummary,
  type Word,
} from '@interlinear/shared'
import { adminTokenConfigured, isAdminToken } from './auth.js'
import { migrateAppTables, normalizeDatabaseUrl } from './db.js'

export interface Ctx {
  /** True for intents issued by the server's own gloss worker. */
  internal: boolean
  /** True when the request carried the owner passphrase (or none is set). */
  admin: boolean
}

/** Intents that mutate the library — owner-only once ADMIN_TOKEN is set. */
const ADMIN_INTENTS: ReadonlySet<string> = new Set([
  addText.type,
  removeText.type,
  importTexts.type,
])

/** New dictionary entries generated per rolling 24h before non-owners are
 * asked to come back later — a lid on the LLM bill, not a rate limiter. */
const DEFINITIONS_DAILY_CAP = Number(process.env.DEFINITIONS_DAILY_CAP ?? 300)

/** How many texts may sit in 'glossing' at once. Bounds how much LLM work
 * readers can queue via text.requestGloss — the worker drains one chunk at a
 * time, so this caps the backlog, not the spend rate. */
const GLOSS_QUEUE_CAP = Number(process.env.GLOSS_QUEUE_CAP ?? 10)

export type App = IntentEffectServer<Ctx, pg.PoolClient>

export interface InterlinearApp {
  app: App
  store: PostgresStore
}

interface TextRow {
  id: string
  slug: string
  title: string
  orig_title: string | null
  source: string | null
  lang: string
  kind: string
  status: string
  builtin: boolean
  translator: string | null
  created_at: Date
  chunk_count: string | number
  glossed_count: string | number
  preview_words?: Word[] | null
}

function toSummary(row: TextRow): TextSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    origTitle: row.orig_title,
    source: row.source,
    lang: row.lang,
    kind: row.kind,
    status: row.status as TextStatus,
    builtin: row.builtin,
    translator: row.translator,
    chunkCount: Number(row.chunk_count),
    glossedCount: Number(row.glossed_count),
    createdAt: row.created_at.toISOString(),
    preview: row.preview_words ? row.preview_words.slice(0, PREVIEW_WORDS) : null,
  }
}

const SUMMARY_SQL = `
  select t.id, t.slug, t.title, t.orig_title, t.source, t.lang, t.kind,
         t.status, t.builtin, t.translator, t.created_at,
         count(c.idx) as chunk_count,
         count(c.words) as glossed_count,
         (select c0.words from text_chunks c0
          where c0.text_id = t.id and c0.idx = 0) as preview_words
  from texts t
  left join text_chunks c on c.text_id = t.id
`

export async function createApp(connectionString: string): Promise<InterlinearApp> {
  const store = createPostgresStore({
    connectionString: normalizeDatabaseUrl(connectionString),
  })

  const migrated = await store.migrate()
  if (!migrated.ok) throw new Error(`migration failed: ${migrated.error.message}`)
  await migrateAppTables(store.pool)

  if (!adminTokenConfigured()) {
    console.warn(
      '[auth] ADMIN_TOKEN is not set — anyone can add and remove texts. ' +
        'Set it in production.',
    )
  }

  const app = createIntentEffect<Ctx, pg.PoolClient>({
    store,
    context: (req) => {
      const header = req.headers['x-admin-token']
      return {
        internal: false,
        admin: isAdminToken(Array.isArray(header) ? header[0] : header),
      }
    },
    tx: (raw) => raw as pg.PoolClient,
    authorizeIntent: (contract, _input, ctx) => {
      if (INTERNAL_INTENTS.has(contract.type) && !ctx.internal) {
        return err(
          intentEffectError('unauthorized', `intent "${contract.type}" is internal`),
        )
      }
      if (ADMIN_INTENTS.has(contract.type) && !ctx.admin && !ctx.internal) {
        return err(
          intentEffectError(
            'unauthorized',
            'adding and removing texts requires the owner passphrase',
          ),
        )
      }
      return { ok: true, value: undefined }
    },
  })

  /* ---------------- intents ---------------- */

  app.handle(addText, async ({ input, tx, emit }) => {
    const chunks = splitChunks(input.original)
    if (chunks.length === 0) {
      return err(intentEffectError('validation_failed', 'the text contains no words'))
    }

    const base = slugify(input.title)
    const taken = await tx.query<{ slug: string }>(
      `select slug from texts where slug = $1 or slug like $2`,
      [base, `${base}-%`],
    )
    const slugs = new Set(taken.rows.map((r) => r.slug))
    let slug = base
    for (let n = 2; slugs.has(slug); n++) slug = `${base}-${n}`

    const id = crypto.randomUUID()
    const inserted = await tx.query<TextRow>(
      `insert into texts (id, slug, title, orig_title, source, lang, kind, status)
       values ($1, $2, $3, $4, $5, $6, $7, 'glossing')
       returning id, slug, title, orig_title, source, lang, kind, status, builtin, translator, created_at`,
      [
        id,
        slug,
        input.title.trim(),
        input.origTitle?.trim() || null,
        input.source?.trim() || null,
        input.lang.trim(),
        input.kind,
      ],
    )
    for (const [idx, original] of chunks.entries()) {
      await tx.query(
        `insert into text_chunks (text_id, idx, original) values ($1, $2, $3)`,
        [id, idx, original],
      )
    }

    const row = inserted.rows[0]!
    emit(textAdded, {
      ...toSummary({ ...row, chunk_count: chunks.length, glossed_count: 0 }),
    })
  })

  app.handle(removeText, async ({ input, tx, emit }) => {
    const deleted = await tx.query(
      `delete from texts where id = $1 and builtin = false`,
      [input.id],
    )
    if (deleted.rowCount === 0) {
      return err(
        intentEffectError('not_found', 'text not found (built-in texts cannot be removed)'),
      )
    }
    emit(textRemoved, { id: input.id })
  })

  app.handle(importTexts, async ({ input, tx, emit }) => {
    const queued: string[] = []
    for (const uid of input.uids) {
      // New uids queue; failed ones re-queue for a retry; pending and done
      // rows are left alone (no rowCount, so they don't count as queued).
      const inserted = await tx.query(
        `insert into imports (uid, status) values ($1, 'pending')
         on conflict (uid) do update set status = 'pending', error = null
         where imports.status = 'failed'`,
        [uid],
      )
      if (inserted.rowCount) queued.push(uid)
    }
    if (queued.length === 0) {
      return err(
        intentEffectError(
          'validation_failed',
          'all of these uids are already imported or queued',
        ),
      )
    }
    emit(textImportQueued, { uids: queued })
  })

  app.handle(requestGloss, async ({ input, tx, emit }) => {
    const found = await tx.query<{ status: string }>(
      `select status from texts where id = $1`,
      [input.id],
    )
    if (!found.rows[0]) {
      return err(intentEffectError('not_found', 'text not found'))
    }
    // 'unglossed' texts wait for their first reader; 'failed' ones get a
    // fresh attempt (already-glossed chunks are kept — the worker only
    // picks up chunks without words). Anything else is queued or done.
    const status = found.rows[0].status
    if (status !== 'unglossed' && status !== 'failed') return
    const queued = await tx.query<{ n: string }>(
      `select count(*) as n from texts where status = 'glossing'`,
    )
    if (Number(queued.rows[0]!.n) >= GLOSS_QUEUE_CAP) {
      return err(
        intentEffectError(
          'handler_failed',
          'many texts are being glossed right now — please try again in a while',
        ),
      )
    }
    await tx.query(`update texts set status = 'glossing' where id = $1`, [input.id])
    emit(textGlossQueued, { textId: input.id })
  })

  app.handle(defineWord, async ({ input, ctx, tx, emit }) => {
    const word = normalizeWord(input.word)
    const lang = input.lang.trim()
    if (!word) {
      return err(intentEffectError('validation_failed', 'not a word'))
    }
    const existing = await tx.query<{ status: string }>(
      `select status from definitions where lang = $1 and word = $2 and tier = $3`,
      [lang, word, input.tier],
    )
    const status = existing.rows[0]?.status
    // 'ready' and 'pending' need no new event: the projection snapshot (or the
    // already-emitted request event) covers the client. A failed lookup is retried.
    if (status === 'ready' || status === 'pending') return
    if (!ctx.admin && !existing.rows[0]) {
      const recent = await tx.query<{ n: string }>(
        `select count(*) as n from definitions
         where created_at > now() - interval '24 hours'`,
      )
      if (Number(recent.rows[0]!.n) >= DEFINITIONS_DAILY_CAP) {
        return err(
          intentEffectError(
            'handler_failed',
            'the dictionary’s daily budget is spent — please try again tomorrow',
          ),
        )
      }
    }
    await tx.query(
      `insert into definitions (lang, word, tier, kind, status)
       values ($1, $2, $3, $4, 'pending')
       on conflict (lang, word, tier) do update set status = 'pending', error = null`,
      [lang, word, input.tier, input.kind],
    )
    emit(wordDefinitionRequested, { lang, word, tier: input.tier })
  })

  /* Internal intents — reachable only with ctx.internal (the gloss worker). */

  app.handle(announceText, async ({ input, tx, emit }) => {
    const rows = await tx.query<TextRow>(
      `${SUMMARY_SQL} where t.id = $1 group by t.id`,
      [input.id],
    )
    if (!rows.rows[0]) {
      return err(intentEffectError('not_found', 'text not found'))
    }
    emit(textAdded, toSummary(rows.rows[0]))
  })

  app.handle(saveChunkGloss, async ({ input, tx, emit }) => {
    // Imported chunks already carry a human translation (e.g. Bhikkhu
    // Sujato's) — keep it; the LLM's translation only fills a blank.
    const existing = await tx.query<{ translation: string | null }>(
      `select translation from text_chunks where text_id = $1 and idx = $2`,
      [input.textId, input.idx],
    )
    if (existing.rows.length === 0) {
      return err(intentEffectError('not_found', 'chunk not found'))
    }
    const translation = existing.rows[0]!.translation?.trim() || input.translation
    await tx.query(
      `update text_chunks set words = $3, translation = $4
       where text_id = $1 and idx = $2`,
      [input.textId, input.idx, JSON.stringify(input.words), translation],
    )
    const counts = await tx.query<{ chunk_count: string; glossed_count: string }>(
      `select count(idx) as chunk_count, count(words) as glossed_count
       from text_chunks where text_id = $1`,
      [input.textId],
    )
    const chunkCount = Number(counts.rows[0]!.chunk_count)
    const glossedCount = Number(counts.rows[0]!.glossed_count)
    const status: TextStatus = glossedCount >= chunkCount ? 'ready' : 'glossing'
    if (status === 'ready') {
      await tx.query(`update texts set status = 'ready' where id = $1`, [input.textId])
    }
    emit(textChunkGlossed, {
      textId: input.textId,
      idx: input.idx,
      words: input.words,
      translation,
      glossedCount,
      status,
    })
  })

  app.handle(markGlossFailed, async ({ input, tx, emit }) => {
    await tx.query(`update texts set status = 'failed' where id = $1`, [input.textId])
    emit(textGlossFailed, { textId: input.textId, error: input.error })
  })

  app.handle(saveDefinition, async ({ input, tx, emit }) => {
    if (input.definition) {
      await tx.query(
        `update definitions set status = 'ready', definition = $4, error = null
         where lang = $1 and word = $2 and tier = $3`,
        [input.lang, input.word, input.tier, JSON.stringify(input.definition)],
      )
      emit(wordDefined, {
        lang: input.lang,
        word: input.word,
        tier: input.tier,
        definition: input.definition,
      })
    } else {
      const error = input.error ?? 'definition lookup failed'
      await tx.query(
        `update definitions set status = 'failed', error = $4
         where lang = $1 and word = $2 and tier = $3`,
        [input.lang, input.word, input.tier, error],
      )
      emit(wordDefinitionFailed, {
        lang: input.lang,
        word: input.word,
        tier: input.tier,
        error,
      })
    }
  })

  /* ---------------- projections ---------------- */

  app.project(textLibrary, {
    query: async ({ tx }) => {
      const result = await tx.query<TextRow>(
        `${SUMMARY_SQL} group by t.id order by t.created_at asc, t.id asc`,
      )
      return result.rows.map(toSummary)
    },
  })

  app.project(textDetail, {
    query: async ({ params, tx }) => {
      const texts = await tx.query<TextRow>(
        `${SUMMARY_SQL} where t.slug = $1 group by t.id`,
        [params.slug],
      )
      const row = texts.rows[0]
      if (!row) return null
      const chunks = await tx.query(
        `select idx, original, words, translation from text_chunks
         where text_id = $1 order by idx asc`,
        [row.id],
      )
      return { text: toSummary(row), chunks: chunks.rows }
    },
  })

  app.project(wordDefinition, {
    query: async ({ params, tx }) => {
      const word = normalizeWord(params.word)
      const result = await tx.query(
        `select status, definition, error from definitions
         where lang = $1 and word = $2 and tier = $3`,
        [params.lang, word, params.tier],
      )
      const row = result.rows[0]
      if (!row) return { status: 'none', definition: null, error: null }
      return {
        status: row.status,
        definition: row.definition ?? null,
        error: row.error ?? null,
      }
    },
  })

  return { app, store }
}

/** Issue an intent from the server itself (the gloss worker). */
export async function sendInternal(
  app: App,
  contract: { type: string },
  input: unknown,
): Promise<void> {
  const result = await app.executeSend(
    { intentId: crypto.randomUUID(), type: contract.type, input },
    { internal: true, admin: true },
  )
  if (!result.ok) {
    throw new Error(`${contract.type} failed: ${result.error.message}`)
  }
}
