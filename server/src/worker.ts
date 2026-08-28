import type pg from 'pg'
import {
  announceText,
  markGlossFailed,
  saveChunkGloss,
  saveDefinition,
  type DefinitionTier,
} from '@interlinear/shared'
import { sendInternal, type App } from './app.js'
import { lookupDpd } from './dpd.js'
import { expandUid, importSutta } from './import/importer.js'
import {
  definitionsAvailable,
  defineWordLlm,
  glossAvailable,
  glossChunk,
} from './llm.js'

const POLL_MS = 2_000
/** Failures before a text is marked 'failed' — parallel chunks can fail in
 * bursts, and a reader re-opening the text re-queues it anyway. */
const MAX_CHUNK_FAILURES = 4
/** Chunks glossed in parallel per tick. */
const GLOSS_CONCURRENCY = Number(process.env.GLOSS_CONCURRENCY ?? 3)

const NO_KEY_ERROR =
  'Glossing is not available: the server has no ANTHROPIC_API_KEY configured.'

interface PendingDefinition {
  lang: string
  word: string
  tier: DefinitionTier
  kind: string
}

interface PendingChunk {
  text_id: string
  idx: number
  original: string
  translation: string | null
  title: string
  source: string | null
  lang: string
  kind: string
}

/**
 * Background LLM worker. Glossing and definitions are too slow to run inside
 * an intent's database transaction, so intents only record what was asked
 * (status = 'glossing' / 'pending'); this worker polls for that recorded
 * work, calls Claude, and commits the results through internal intents —
 * which emit the events that update every connected client's projections.
 */
export class GlossWorker {
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private stopped = false
  private readonly chunkFailures = new Map<string, number>()

  constructor(
    private readonly app: App,
    private readonly pool: pg.Pool,
  ) {}

  start(): void {
    this.stopped = false
    this.schedule(POLL_MS)
  }

  stop(): void {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  /** Ask the worker to look for new work soon (e.g. right after an intent). */
  kick(delayMs = 300): void {
    if (this.stopped) return
    this.schedule(delayMs)
  }

  private schedule(delayMs: number): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.tick(), delayMs)
  }

  private async tick(): Promise<void> {
    if (this.running || this.stopped) return
    this.running = true
    let hadWork = false
    try {
      // Definitions are user-awaited (a reader is looking at a spinner), so
      // they must never queue behind a slow gloss call — run all three
      // streams in parallel. Imports are chunked to one sutta per tick, so
      // a queued collection never starves the others.
      const [chunkWork, defWork, importWork] = await Promise.all([
        this.processChunks(),
        this.processDefinitions(),
        this.processImports(),
      ])
      hadWork = chunkWork || defWork || importWork
    } catch (cause) {
      console.error('[worker]', cause)
    } finally {
      this.running = false
      if (!this.stopped) this.schedule(hadWork ? 50 : POLL_MS)
    }
  }

  private async processChunks(): Promise<boolean> {
    const pending = await this.pool.query<PendingChunk>(
      `select c.text_id, c.idx, c.original, c.translation, t.title, t.source, t.lang, t.kind
       from text_chunks c
       join texts t on t.id = c.text_id
       where t.status = 'glossing' and c.words is null
       order by t.created_at asc, c.idx asc
       limit ${GLOSS_CONCURRENCY}`,
    )
    if (pending.rows.length === 0) return false

    if (!glossAvailable()) {
      await sendInternal(this.app, markGlossFailed, {
        textId: pending.rows[0]!.text_id,
        error: NO_KEY_ERROR,
      })
      return true
    }

    await Promise.all(pending.rows.map((chunk) => this.processChunk(chunk)))
    return true
  }

  private async processChunk(chunk: PendingChunk): Promise<void> {
    try {
      console.log(`[worker] glossing "${chunk.title}" chunk ${chunk.idx}`)
      const gloss = await glossChunk(chunk.original, {
        title: chunk.title,
        source: chunk.source,
        lang: chunk.lang,
        kind: chunk.kind,
        translation: chunk.translation,
      })
      await sendInternal(this.app, saveChunkGloss, {
        textId: chunk.text_id,
        idx: chunk.idx,
        words: gloss.words,
        translation: gloss.translation,
      })
      this.chunkFailures.delete(chunk.text_id)
    } catch (cause) {
      const failures = (this.chunkFailures.get(chunk.text_id) ?? 0) + 1
      this.chunkFailures.set(chunk.text_id, failures)
      console.error(`[worker] gloss failed (${failures}) for ${chunk.text_id}:`, cause)
      if (failures >= MAX_CHUNK_FAILURES) {
        this.chunkFailures.delete(chunk.text_id)
        await sendInternal(this.app, markGlossFailed, {
          textId: chunk.text_id,
          error: cause instanceof Error ? cause.message : String(cause),
        })
      }
    }
  }

  /** Work the text.import queue: expand a collection uid into per-sutta
   * rows, or import one sutta from SuttaCentral, per tick. */
  private async processImports(): Promise<boolean> {
    const pending = await this.pool.query<{ uid: string }>(
      `select uid from imports where status = 'pending'
       order by requested_at asc, uid asc limit 1`,
    )
    const row = pending.rows[0]
    if (!row) return false
    const uid = row.uid

    try {
      const leaves = await expandUid(uid)
      if (leaves.length === 0) throw new Error('no suttas found for this uid')
      if (leaves.length === 1 && leaves[0]!.uid === uid) {
        const result = await importSutta(this.pool, leaves[0]!, {
          dryRun: false,
          force: false,
        })
        if (result.outcome === 'failed') {
          throw new Error(result.error ?? 'import failed')
        }
        if (result.id) {
          await sendInternal(this.app, announceText, { id: result.id })
        }
      } else {
        // A collection: queue its suttas and let later ticks import them.
        for (const leaf of leaves) {
          await this.pool.query(
            `insert into imports (uid, status) values ($1, 'pending')
             on conflict (uid) do nothing`,
            [leaf.uid],
          )
        }
        console.log(`[worker] import: expanded ${uid} into ${leaves.length} suttas`)
      }
      await this.pool.query(
        `update imports set status = 'done', error = null where uid = $1`,
        [uid],
      )
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      console.error(`[worker] import failed for ${uid}:`, message)
      await this.pool.query(
        `update imports set status = 'failed', error = $2 where uid = $1`,
        [uid, message],
      )
    }
    return true
  }

  private async processDefinitions(): Promise<boolean> {
    const pending = await this.pool.query<PendingDefinition>(
      `select lang, word, tier, kind from definitions where status = 'pending'
       order by created_at asc limit 4`,
    )
    if (pending.rows.length === 0) return false

    await Promise.all(pending.rows.map((row) => this.processDefinition(row)))
    return true
  }

  private async processDefinition(row: PendingDefinition): Promise<void> {
    const { lang, word, tier, kind } = row
    // The 'dpd' tier is a dictionary lookup, not an LLM call — no API key
    // needed, and a missing entry is a normal outcome (the LLM tiers cover it).
    if (tier === 'dpd') {
      try {
        const definition = await lookupDpd(word)
        await sendInternal(this.app, saveDefinition, {
          lang,
          word,
          tier,
          definition,
          error: definition ? null : 'not in the Digital Pāḷi Dictionary',
        })
      } catch (cause) {
        console.error(`[worker] DPD lookup failed for "${word}":`, cause)
        await sendInternal(this.app, saveDefinition, {
          lang,
          word,
          tier,
          definition: null,
          error: cause instanceof Error ? cause.message : String(cause),
        })
      }
      return
    }
    if (!definitionsAvailable()) {
      await sendInternal(this.app, saveDefinition, {
        lang,
        word,
        tier,
        definition: null,
        error: NO_KEY_ERROR,
      })
      return
    }
    try {
      const definition = await defineWordLlm(lang, word, kind, tier)
      await sendInternal(this.app, saveDefinition, {
        lang,
        word,
        tier,
        definition,
        error: null,
      })
    } catch (cause) {
      console.error(`[worker] definition failed for "${word}" (${tier}):`, cause)
      await sendInternal(this.app, saveDefinition, {
        lang,
        word,
        tier,
        definition: null,
        error: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }
}
