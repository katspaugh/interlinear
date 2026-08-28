import { z } from 'zod'
import { event, intent, projection } from '@intenteffect/core'

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

/** One token with its interlinear gloss. `nl` marks a line break after it. */
export const wordSchema = z.object({
  w: z.string(),
  g: z.string(),
  nl: z.boolean().optional(),
})
export type Word = z.output<typeof wordSchema>

/** 'unglossed' marks imported texts (original + translation, no word glosses
 * yet) that wait for a reader: the gloss worker ignores them until a
 * `text.requestGloss` intent moves them to 'glossing'. */
export const textStatusSchema = z.enum(['unglossed', 'glossing', 'ready', 'failed'])
export type TextStatus = z.output<typeof textStatusSchema>

export const textSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  /** Title in the original language (e.g. the Pali title of a sutta). */
  origTitle: z.string().nullable(),
  source: z.string().nullable(),
  /** Human-readable language name, e.g. "Pali". */
  lang: z.string(),
  /** Text-type preset id (see presets.ts), e.g. "sutta", "poetry". */
  kind: z.string(),
  status: textStatusSchema,
  builtin: z.boolean(),
  /** Credit line for an imported human translation (e.g. "Bhikkhu Sujato,
   * SuttaCentral"); null for user texts and LLM-only translations. */
  translator: z.string().nullable(),
  chunkCount: z.number().int(),
  glossedCount: z.number().int(),
  createdAt: z.string(),
  /** First words of the first glossed chunk — the library card preview. */
  preview: z.array(wordSchema).nullable(),
})
export type TextSummary = z.output<typeof textSummarySchema>

export const chunkSchema = z.object({
  idx: z.number().int(),
  original: z.string(),
  words: z.array(wordSchema).nullable(),
  translation: z.string().nullable(),
})
export type Chunk = z.output<typeof chunkSchema>

export const textDetailSchema = z.object({
  text: textSummarySchema,
  chunks: z.array(chunkSchema),
})
export type TextDetail = z.output<typeof textDetailSchema>

/** Depth of a dictionary entry: 'fast' is the quick entry generated on tap,
 * 'deep' is the richer entry loaded on demand. Each is cached separately. */
export const definitionTierSchema = z.enum(['fast', 'deep'])
export type DefinitionTier = z.output<typeof definitionTierSchema>

/** An LLM-generated dictionary entry for a word. */
export const definitionSchema = z.object({
  headword: z.string(),
  grammar: z.string(),
  meanings: z.array(z.string()),
  analysis: z.string().nullable(),
  etymology: z.string().nullable(),
})
export type Definition = z.output<typeof definitionSchema>

export const definitionStatusSchema = z.enum(['none', 'pending', 'ready', 'failed'])

export const wordDefinitionStateSchema = z.object({
  status: definitionStatusSchema,
  definition: definitionSchema.nullable(),
  error: z.string().nullable(),
})
export type WordDefinitionState = z.output<typeof wordDefinitionStateSchema>

/* ------------------------------------------------------------------ */
/* Events: "X happened" — emitted only by the server                   */
/* ------------------------------------------------------------------ */

export const textAdded = event('text.added', textSummarySchema)

export const textChunkGlossed = event(
  'text.chunkGlossed',
  z.object({
    textId: z.uuid(),
    idx: z.number().int(),
    words: z.array(wordSchema),
    translation: z.string(),
    glossedCount: z.number().int(),
    status: textStatusSchema,
  }),
)

export const textGlossFailed = event(
  'text.glossFailed',
  z.object({ textId: z.uuid(), error: z.string() }),
)

export const textRemoved = event('text.removed', z.object({ id: z.uuid() }))

/** An unglossed (imported) text was queued for glossing by a reader. */
export const textGlossQueued = event(
  'text.glossQueued',
  z.object({ textId: z.uuid() }),
)

export const wordDefinitionRequested = event(
  'word.definitionRequested',
  z.object({ lang: z.string(), word: z.string(), tier: definitionTierSchema }),
)

export const wordDefined = event(
  'word.defined',
  z.object({
    lang: z.string(),
    word: z.string(),
    tier: definitionTierSchema,
    definition: definitionSchema,
  }),
)

export const wordDefinitionFailed = event(
  'word.definitionFailed',
  z.object({
    lang: z.string(),
    word: z.string(),
    tier: definitionTierSchema,
    error: z.string(),
  }),
)

/* ------------------------------------------------------------------ */
/* Intents: "please make X happen"                                     */
/* ------------------------------------------------------------------ */

export const addText = intent(
  'text.add',
  z.object({
    title: z.string().min(1).max(200),
    origTitle: z.string().max(200).optional(),
    source: z.string().max(200).optional(),
    lang: z.string().min(1).max(50),
    kind: z.string().min(1).max(50).default('prose'),
    original: z.string().min(1).max(50_000),
  }),
  { emits: [textAdded] },
)

export const removeText = intent('text.remove', z.object({ id: z.uuid() }), {
  emits: [textRemoved],
})

/** Ask for an imported, not-yet-glossed text to be glossed. Sent by the
 * reader when someone opens an 'unglossed' text — glossing is demand-driven,
 * so the community's reading decides what gets glossed first. Open to
 * everyone (not admin-gated); a no-op for texts in any other status. */
export const requestGloss = intent(
  'text.requestGloss',
  z.object({ id: z.uuid() }),
  { emits: [textGlossQueued] },
)

export const defineWord = intent(
  'word.define',
  z.object({
    lang: z.string().min(1).max(50),
    word: z.string().min(1).max(100),
    /** Text-type preset of the text the word was clicked in. */
    kind: z.string().min(1).max(50).default('prose'),
    tier: definitionTierSchema.default('fast'),
  }),
  { emits: [wordDefinitionRequested] },
)

/* Internal intents — issued by the server's own gloss worker, rejected
 * for plain HTTP clients by the server's authorizeIntent hook. */

export const saveChunkGloss = intent(
  'text.saveChunkGloss',
  z.object({
    textId: z.uuid(),
    idx: z.number().int().min(0),
    words: z.array(wordSchema),
    translation: z.string(),
  }),
  { emits: [textChunkGlossed] },
)

export const markGlossFailed = intent(
  'text.markGlossFailed',
  z.object({ textId: z.uuid(), error: z.string() }),
  { emits: [textGlossFailed] },
)

export const saveDefinition = intent(
  'word.saveDefinition',
  z.object({
    lang: z.string(),
    word: z.string(),
    tier: definitionTierSchema,
    definition: definitionSchema.nullable(),
    error: z.string().nullable(),
  }),
  { emits: [wordDefined, wordDefinitionFailed] },
)

export const INTERNAL_INTENTS: ReadonlySet<string> = new Set([
  saveChunkGloss.type,
  markGlossFailed.type,
  saveDefinition.type,
])

/* ------------------------------------------------------------------ */
/* Projections: synchronized views                                     */
/* ------------------------------------------------------------------ */

/** How many words of the first chunk feed the library card preview. */
export const PREVIEW_WORDS = 40

/** All texts, oldest first — powers the home page cards. */
export const textLibrary = projection({
  name: 'texts.library',
  result: z.array(textSummarySchema),
})
  .on(textAdded, (texts, data) =>
    texts.some((t) => t.id === data.id) ? texts : [...texts, data],
  )
  .on(textChunkGlossed, (texts, data) =>
    texts.map((t) =>
      t.id === data.textId
        ? {
            ...t,
            glossedCount: data.glossedCount,
            status: data.status,
            preview: data.idx === 0 ? data.words.slice(0, PREVIEW_WORDS) : t.preview,
          }
        : t,
    ),
  )
  .on(textGlossFailed, (texts, data) =>
    texts.map((t) => (t.id === data.textId ? { ...t, status: 'failed' as const } : t)),
  )
  .on(textGlossQueued, (texts, data) =>
    texts.map((t) =>
      t.id === data.textId ? { ...t, status: 'glossing' as const } : t,
    ),
  )
  .on(textRemoved, (texts, data) => texts.filter((t) => t.id !== data.id))

/** One text with all its chunks — powers the reader. Null when not found. */
export const textDetail = projection({
  name: 'texts.detail',
  params: z.object({ slug: z.string() }),
  result: textDetailSchema.nullable(),
})
  .on(textChunkGlossed, (detail, data) => {
    if (!detail || detail.text.id !== data.textId) return detail
    return {
      text: { ...detail.text, glossedCount: data.glossedCount, status: data.status },
      chunks: detail.chunks.map((chunk) =>
        chunk.idx === data.idx
          ? { ...chunk, words: data.words, translation: data.translation }
          : chunk,
      ),
    }
  })
  .on(textGlossFailed, (detail, data) => {
    if (!detail || detail.text.id !== data.textId) return detail
    return { ...detail, text: { ...detail.text, status: 'failed' as const } }
  })
  .on(textGlossQueued, (detail, data) => {
    if (!detail || detail.text.id !== data.textId) return detail
    return { ...detail, text: { ...detail.text, status: 'glossing' as const } }
  })
  .on(textRemoved, (detail, data) =>
    detail && detail.text.id === data.id ? null : detail,
  )

/** The dictionary entry for one normalized word at one tier — powers the sidebar. */
export const wordDefinition = projection({
  name: 'words.definition',
  params: z.object({ lang: z.string(), word: z.string(), tier: definitionTierSchema }),
  result: wordDefinitionStateSchema,
})
  .on(wordDefinitionRequested, (state, data, params) =>
    data.lang === params.lang &&
    data.word === params.word &&
    data.tier === params.tier &&
    state.status === 'none'
      ? { status: 'pending' as const, definition: null, error: null }
      : state,
  )
  .on(wordDefined, (state, data, params) =>
    data.lang === params.lang && data.word === params.word && data.tier === params.tier
      ? { status: 'ready' as const, definition: data.definition, error: null }
      : state,
  )
  .on(wordDefinitionFailed, (state, data, params) =>
    data.lang === params.lang && data.word === params.word && data.tier === params.tier
      ? { status: 'failed' as const, definition: null, error: data.error }
      : state,
  )
