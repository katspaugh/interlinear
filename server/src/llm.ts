import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import {
  morphsAlign,
  paliPrefixReference,
  textKindPreset,
  tokenizeChunk,
  type Definition,
  type DefinitionTier,
  type Morph,
  type Word,
} from '@interlinear/shared'

/* ------------------------------------------------------------------ */
/* Backends                                                            */
/*                                                                     */
/* Glossing can run against any Anthropic-compatible endpoint (e.g.    */
/* DeepSeek's) to make bulk seeding cheap: set GLOSS_BASE_URL,         */
/* GLOSS_API_KEY, and GLOSS_MODEL. With a custom base URL the code     */
/* switches to "compat" mode: Anthropic-only structured outputs are    */
/* replaced by a JSON instruction + local Zod validation.              */
/* Definitions always use the Anthropic API (they are cheap already).  */
/* ------------------------------------------------------------------ */

/* Setting DEEPSEEK_API_KEY alone (the recommended bulk setup) routes
 * glossing to DeepSeek's Anthropic-compatible endpoint; GLOSS_BASE_URL /
 * GLOSS_API_KEY / GLOSS_MODEL still override any part of it. */
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/anthropic'
const DEEPSEEK_MODEL = 'deepseek-v4-pro'
const useDeepSeek = !process.env.GLOSS_BASE_URL && Boolean(process.env.DEEPSEEK_API_KEY)

const GLOSS_MODEL =
  process.env.GLOSS_MODEL ??
  (useDeepSeek ? DEEPSEEK_MODEL : (process.env.ANTHROPIC_MODEL ?? 'claude-opus-5'))
const GLOSS_BASE_URL =
  process.env.GLOSS_BASE_URL ?? (useDeepSeek ? DEEPSEEK_BASE_URL : undefined)
/** Quick entry shown on tap — small fast model, no extended reasoning. */
const FAST_DEFINITION_MODEL =
  process.env.DEFINITION_MODEL_FAST ?? 'claude-haiku-4-5'
/** Richer entry loaded on demand via the "detailed entry" button. */
const DEEP_DEFINITION_MODEL = process.env.DEFINITION_MODEL_DEEP ?? 'claude-sonnet-5'

export function glossAvailable(): boolean {
  return Boolean(
    process.env.GLOSS_API_KEY ??
      process.env.DEEPSEEK_API_KEY ??
      process.env.ANTHROPIC_API_KEY,
  )
}

export function definitionsAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

let anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  anthropicClient ??= new Anthropic()
  return anthropicClient
}

let glossClient: Anthropic | null = null
function getGlossClient(): Anthropic {
  // A dedicated client with a hard per-request timeout: glossing runs in the
  // background worker, where one hung request (the SDK default allows 10
  // minutes, retried) would silently stall the whole queue.
  glossClient ??= new Anthropic({
    baseURL: GLOSS_BASE_URL,
    apiKey:
      process.env.GLOSS_API_KEY ??
      process.env.DEEPSEEK_API_KEY ??
      process.env.ANTHROPIC_API_KEY,
    timeout: 180_000,
    maxRetries: 1,
  })
  return glossClient
}

/* ------------------------------------------------------------------ */
/* Compat-mode JSON parsing                                            */
/* ------------------------------------------------------------------ */

/** Extract and validate a JSON object from free-form model text
 * (tolerates markdown fences and prose around the object). */
export function parseJsonResult<S extends z.ZodType>(
  schema: S,
  text: string,
): z.output<S> {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new Error('the model returned no JSON object')
  }
  let value: unknown
  try {
    value = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('the model returned malformed JSON')
  }
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new Error('the model returned JSON with the wrong shape')
  }
  return parsed.data
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

/* ------------------------------------------------------------------ */
/* Glossing                                                            */
/* ------------------------------------------------------------------ */

function glossSystem(lang: string, kind: string): string {
  const preset = textKindPreset(kind)
  return `You are an expert philologist of ${lang}, preparing interlinear glosses for language learners.

For each numbered token you receive, return one entry with:

- "g": a concise English gloss (1–4 words) that reflects the token's inflected form: case, number, tense, voice, participles, contractions. Gloss compounds as a whole. Particles get their function ("and", "indeed", "quotation marker"). Keep glosses lowercase except proper names.
- "m": the token's morpheme segmentation, or null. Each segment has "s" (the exact characters of the segment), "k" (one of "prefix", "root", "stem", "ending"), "g" (a one-word gloss of the morpheme where it carries meaning — compound members, prefixes, roots; null for purely grammatical endings), and "sandhi" (true only on a segment that begins a second word fused into this token by sandhi or contraction; null otherwise). The segments MUST concatenate exactly, character for character, to the token as written — including capitalization and any punctuation, which belongs to the last segment. Segment only what you are certain of: for single-morpheme words, particles, names, or any token you cannot segment confidently, return null — never guess.

Return exactly one entry per token, in the same order.

Also produce a fluent, accurate English translation of the whole passage.

${preset.glossHint}`
}

const COMPAT_JSON_INSTRUCTION = `

Respond with ONLY a JSON object of the shape {"words": {"g": string, "m": {"s": string, "k": "prefix"|"root"|"stem"|"ending", "g": string|null, "sandhi": boolean|null}[]|null}[], "translation": string} — no markdown fences, no commentary.`

/* Structured outputs handle explicit nulls better than absent fields, so the
 * LLM-facing schema is all-nullable; glossChunk converts to the compact
 * contract shape (optional fields, nulls dropped). */
const glossMorphSchema = z.object({
  s: z.string(),
  k: z.enum(['prefix', 'root', 'stem', 'ending']),
  g: z.string().nullish(),
  sandhi: z.boolean().nullish(),
})
const glossResultSchema = z.object({
  words: z.array(
    z.object({
      g: z.string(),
      m: z.array(glossMorphSchema).nullish(),
    }),
  ),
  translation: z.string(),
})
type GlossResult = z.output<typeof glossResultSchema>

/** Convert one LLM word entry's segmentation to the contract shape, dropping
 * it entirely when it breaks the concatenation invariant or carries no
 * information beyond the whole word. */
export function sanitizeMorphs(
  surface: string,
  morphs: z.output<typeof glossMorphSchema>[] | null | undefined,
): Morph[] | undefined {
  if (!morphs || morphs.length < 2) return undefined
  const converted: Morph[] = morphs.map((m) => ({
    s: m.s,
    k: m.k,
    ...(m.g ? { g: m.g } : {}),
    ...(m.sandhi ? { sandhi: true } : {}),
  }))
  return morphsAlign(surface, converted) ? converted : undefined
}

async function requestGloss(system: string, prompt: string): Promise<GlossResult> {
  if (!GLOSS_BASE_URL) {
    const response = await getGlossClient().messages.parse({
      model: GLOSS_MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: zodOutputFormat(glossResultSchema) },
    })
    if (response.stop_reason === 'refusal') {
      throw new Error('the model declined to gloss this passage')
    }
    if (!response.parsed_output) {
      throw new Error('the model returned an unparsable gloss')
    }
    return response.parsed_output
  }
  // Compat endpoints don't implement Anthropic structured outputs — ask for
  // plain JSON and validate locally. Thinking is explicitly disabled:
  // DeepSeek reasons by default here, which made each gloss take minutes
  // and often exhausted max_tokens before the JSON (glossing with the
  // reference translation at hand doesn't need reasoning — measured 4s
  // without thinking vs 25s+ with, on the same chunk).
  const response = await getGlossClient().messages.create({
    model: GLOSS_MODEL,
    max_tokens: 16000,
    thinking: { type: 'disabled' },
    system: system + COMPAT_JSON_INSTRUCTION,
    messages: [{ role: 'user', content: prompt }],
  })
  return parseJsonResult(glossResultSchema, textOf(response))
}

export interface ChunkGloss {
  words: Word[]
  translation: string
}

export interface GlossContext {
  title: string
  source: string | null
  lang: string
  kind: string
  /** Existing human translation of the passage (e.g. an imported sutta's),
   * given to the model as reference — it sharply improves gloss accuracy. */
  translation?: string | null
}

/** Gloss one chunk of text. Tokenization is done locally so the gloss
 * always aligns 1:1 with the tokens the reader displays. */
export async function glossChunk(
  original: string,
  context: GlossContext,
): Promise<ChunkGloss> {
  const tokens = tokenizeChunk(original)
  if (tokens.length === 0) return { words: [], translation: '' }

  const tokenList = tokens.map((t, i) => `${i + 1}. ${t.w}`).join('\n')
  const reference = context.translation?.trim()
  const prompt = `Text: ${context.title}${context.source ? ` (${context.source})` : ''}
Language: ${context.lang}

Passage:
${original}
${
  reference
    ? `
Published reference translation (keep your glosses consistent with it; you may reuse it as the translation):
${reference}
`
    : ''
}
Tokens to gloss (${tokens.length} total):
${tokenList}`

  let corrective = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const parsed = await requestGloss(
      glossSystem(context.lang, context.kind),
      prompt + corrective,
    )
    if (parsed.words.length === tokens.length) {
      return {
        words: tokens.map((t, i) => {
          const entry = parsed.words[i]!
          const m = sanitizeMorphs(t.w, entry.m)
          return { ...t, g: entry.g, ...(m ? { m } : {}) }
        }),
        translation: parsed.translation.trim(),
      }
    }
    corrective = `\n\nIMPORTANT: your previous answer had ${parsed.words.length} word entries but there are exactly ${tokens.length} tokens. Return exactly ${tokens.length} entries, one per numbered token.`
  }
  throw new Error('the model could not align glosses with the tokens')
}

/* ------------------------------------------------------------------ */
/* Definitions                                                         */
/* ------------------------------------------------------------------ */

function definitionSystem(lang: string, kind: string, tier: DefinitionTier): string {
  const preset = textKindPreset(kind)
  const depth =
    tier === 'fast'
      ? 'Keep the entry compact — the reader is waiting on a popup: 2–4 meanings as short phrases, and analysis and etymology of one or two sentences each, without extended citations.'
      : 'Write a thorough entry: cover the range of meanings with nuances, give a full morphological analysis, and include etymology with cognates and, where illuminating, canonical usage examples.'
  const paliPrefixes = /\bpali\b/i.test(lang)
    ? `

Reference — the concrete imagery and cognates of the Pali prefixes; keep every morpheme note consistent with it:
${paliPrefixReference()}`
    : ''
  return `You are an expert lexicographer of ${lang}. Given one word as it appears in a text (an inflected surface form, possibly a compound or contraction), write a dictionary entry for language learners:

- headword: the lemma (citation form) the surface form belongs to
- grammar: part of speech and full grammatical analysis of the surface form (e.g. "3rd person singular optative of bhavati")
- meanings: the principal English meanings, most relevant first
- analysis: for compounds, contractions, and sandhi forms, the breakdown into parts with the meaning of each part; null for simple words
- etymology: the root and derivation, with cognates in languages the learner is likely to know (English, Latin, Greek, related modern languages) where they genuinely illuminate; when a prefix shapes the word, show how its concrete spatial sense became the abstract meaning; null otherwise
- morphemes: the word built up morpheme by morpheme, in reading order — for each: part (the segment), kind ("prefix", "root", "stem", or "ending"), gloss (one or two words), and note (one or two sentences: for prefixes and roots, the concrete imagery behind the meaning and genuine cognates; for endings, what the inflection does in this sentence). Include only morphemes you are certain of; null for words that do not decompose or that you cannot analyze confidently — never guess.

Call words cognates only when they demonstrably descend from the same ancestral root; similarity of form or meaning is not evidence (German "haben" and Latin "habere" match in both, yet are unrelated). Never present a loanword source, calque, or mere semantic parallel as a cognate, and when the shared origin is uncertain, omit the cognate rather than guess.

If the word looks misspelled or is not attested, resolve it to the closest attested form and note that in the grammar field.

${depth}

${preset.definitionHint}${paliPrefixes}`.trimEnd()
}

const definitionResultSchema = z.object({
  headword: z.string(),
  grammar: z.string(),
  meanings: z.array(z.string()),
  analysis: z.string().nullable(),
  etymology: z.string().nullable(),
  morphemes: z
    .array(
      z.object({
        part: z.string(),
        kind: z.enum(['prefix', 'root', 'stem', 'ending']),
        gloss: z.string(),
        note: z.string(),
      }),
    )
    .nullable(),
})

/** The user-message context block for a word the Digital Pāḷi Dictionary
 * already covers: the reader sees the DPD basics, so the model's job shifts
 * to the complementary sections. Exported for tests. */
export function dpdContextBlock(dpd: Definition): string {
  return `

The Digital Pāḷi Dictionary already shows the reader this entry for it:
- headword: ${dpd.headword}
- grammar: ${dpd.grammar}
- meanings: ${dpd.meanings.join(' | ')}${dpd.analysis ? `\n- breakup: ${dpd.analysis}` : ''}

Your entry extends that one rather than replacing it: only your morphemes, etymology, and analysis are shown to the reader, alongside the dictionary's meanings. Treat the dictionary's headword, grammar, and meanings as authoritative (still return your own, briefly — they are kept as a cross-check), and spend your effort on the morpheme breakdown, the etymology with cognates, and the compound/sandhi analysis.`
}

export async function defineWordLlm(
  lang: string,
  word: string,
  kind: string,
  tier: DefinitionTier,
  dpd?: Definition | null,
): Promise<Definition> {
  // Haiku 4.5 rejects output_config.effort, so it is only set on the deep
  // tier ('medium' there keeps Sonnet fast; its depth comes from the prompt).
  const response = await getAnthropicClient().messages.parse({
    model: tier === 'fast' ? FAST_DEFINITION_MODEL : DEEP_DEFINITION_MODEL,
    max_tokens: tier === 'fast' ? 2000 : 8000,
    system: definitionSystem(lang, kind, tier),
    messages: [
      {
        role: 'user',
        content: `${lang} word: ${word}${dpd ? dpdContextBlock(dpd) : ''}`,
      },
    ],
    output_config:
      tier === 'fast'
        ? { format: zodOutputFormat(definitionResultSchema) }
        : { format: zodOutputFormat(definitionResultSchema), effort: 'medium' },
  })
  if (response.stop_reason === 'refusal') {
    throw new Error('the model declined to define this word')
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error('the model returned an unparsable definition')
  return parsed
}
