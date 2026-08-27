import type pg from 'pg'
import {
  markGlossFailed,
  saveChunkGloss,
  saveDefinition,
} from '@interlinear/shared'
import { sendInternal, type App } from './app.js'
import { defineWordLlm, glossChunk, llmAvailable } from './llm.js'

const POLL_MS = 2_000
const MAX_CHUNK_FAILURES = 2

const NO_KEY_ERROR =
  'Glossing is not available: the server has no ANTHROPIC_API_KEY configured.'

interface PendingChunk {
  text_id: string
  idx: number
  original: string
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
      hadWork = (await this.processChunk()) || hadWork
      hadWork = (await this.processDefinitions()) || hadWork
    } catch (cause) {
      console.error('[worker]', cause)
    } finally {
      this.running = false
      if (!this.stopped) this.schedule(hadWork ? 50 : POLL_MS)
    }
  }

  private async processChunk(): Promise<boolean> {
    const pending = await this.pool.query<PendingChunk>(
      `select c.text_id, c.idx, c.original, t.title, t.source, t.lang, t.kind
       from text_chunks c
       join texts t on t.id = c.text_id
       where t.status = 'glossing' and c.words is null
       order by t.created_at asc, c.idx asc
       limit 1`,
    )
    const chunk = pending.rows[0]
    if (!chunk) return false

    if (!llmAvailable()) {
      await sendInternal(this.app, markGlossFailed, {
        textId: chunk.text_id,
        error: NO_KEY_ERROR,
      })
      return true
    }

    try {
      const gloss = await glossChunk(chunk.original, {
        title: chunk.title,
        source: chunk.source,
        lang: chunk.lang,
        kind: chunk.kind,
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
    return true
  }

  private async processDefinitions(): Promise<boolean> {
    const pending = await this.pool.query<{ lang: string; word: string; kind: string }>(
      `select lang, word, kind from definitions where status = 'pending'
       order by created_at asc limit 2`,
    )
    if (pending.rows.length === 0) return false

    for (const { lang, word, kind } of pending.rows) {
      if (!llmAvailable()) {
        await sendInternal(this.app, saveDefinition, {
          lang,
          word,
          definition: null,
          error: NO_KEY_ERROR,
        })
        continue
      }
      try {
        const definition = await defineWordLlm(lang, word, kind)
        await sendInternal(this.app, saveDefinition, { lang, word, definition, error: null })
      } catch (cause) {
        console.error(`[worker] definition failed for "${word}":`, cause)
        await sendInternal(this.app, saveDefinition, {
          lang,
          word,
          definition: null,
          error: cause instanceof Error ? cause.message : String(cause),
        })
      }
    }
    return true
  }
}
