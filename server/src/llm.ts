import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import {
  textKindPreset,
  tokenizeChunk,
  type Definition,
  type Word,
} from '@interlinear/shared'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5'

export function llmAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

let client: Anthropic | null = null
function getClient(): Anthropic {
  client ??= new Anthropic()
  return client
}

function glossSystem(lang: string, kind: string): string {
  const preset = textKindPreset(kind)
  return `You are an expert philologist of ${lang}, preparing interlinear glosses for language learners.

For each numbered token you receive, produce a concise English gloss (1–4 words) that reflects the token's inflected form: case, number, tense, voice, participles, contractions. Gloss compounds as a whole. Particles get their function ("and", "indeed", "quotation marker"). Keep glosses lowercase except proper names. Return exactly one gloss per token, in the same order.

Also produce a fluent, accurate English translation of the whole passage.

${preset.glossHint}`
}

const glossResultSchema = z.object({
  glosses: z.array(z.string()),
  translation: z.string(),
})

export interface ChunkGloss {
  words: Word[]
  translation: string
}

export interface GlossContext {
  title: string
  source: string | null
  lang: string
  kind: string
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
  const prompt = `Text: ${context.title}${context.source ? ` (${context.source})` : ''}
Language: ${context.lang}

Passage:
${original}

Tokens to gloss (${tokens.length} total):
${tokenList}`

  let corrective = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: glossSystem(context.lang, context.kind),
      messages: [{ role: 'user', content: prompt + corrective }],
      output_config: { format: zodOutputFormat(glossResultSchema) },
    })
    if (response.stop_reason === 'refusal') {
      throw new Error('the model declined to gloss this passage')
    }
    const parsed = response.parsed_output
    if (!parsed) throw new Error('the model returned an unparsable gloss')
    if (parsed.glosses.length === tokens.length) {
      return {
        words: tokens.map((t, i) => ({ ...t, g: parsed.glosses[i]! })),
        translation: parsed.translation.trim(),
      }
    }
    corrective = `\n\nIMPORTANT: your previous answer had ${parsed.glosses.length} glosses but there are exactly ${tokens.length} tokens. Return exactly ${tokens.length} glosses, one per numbered token.`
  }
  throw new Error('the model could not align glosses with the tokens')
}

function definitionSystem(lang: string, kind: string): string {
  const preset = textKindPreset(kind)
  return `You are an expert lexicographer of ${lang}. Given one word as it appears in a text (an inflected surface form, possibly a compound or contraction), write a dictionary entry for language learners:

- headword: the lemma (citation form) the surface form belongs to
- grammar: part of speech and full grammatical analysis of the surface form (e.g. "3rd person singular optative of bhavati")
- meanings: the principal English meanings, most relevant first
- analysis: for compounds, contractions, and sandhi forms, the breakdown into parts with the meaning of each part; null for simple words
- etymology: the root and derivation, with cognates if illuminating; null otherwise

If the word looks misspelled or is not attested, resolve it to the closest attested form and note that in the grammar field.

${preset.definitionHint}`.trimEnd()
}

const definitionResultSchema = z.object({
  headword: z.string(),
  grammar: z.string(),
  meanings: z.array(z.string()),
  analysis: z.string().nullable(),
  etymology: z.string().nullable(),
})

export async function defineWordLlm(
  lang: string,
  word: string,
  kind: string,
): Promise<Definition> {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: definitionSystem(lang, kind),
    messages: [{ role: 'user', content: `${lang} word: ${word}` }],
    output_config: { format: zodOutputFormat(definitionResultSchema) },
  })
  if (response.stop_reason === 'refusal') {
    throw new Error('the model declined to define this word')
  }
  const parsed = response.parsed_output
  if (!parsed) throw new Error('the model returned an unparsable definition')
  return parsed
}
