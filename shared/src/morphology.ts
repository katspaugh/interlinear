import { z } from 'zod'

/**
 * Morphological segmentation of glossed words. The gloss worker asks the LLM
 * to split each token into morphemes (later: the Digital Pali Dictionary's
 * decomposition, for Pali); the reader renders the segments as colored seams
 * and derives a "literal" morpheme-by-morpheme gloss line from them.
 */

export const morphKindSchema = z.enum(['prefix', 'root', 'stem', 'ending'])
export type MorphKind = z.output<typeof morphKindSchema>

/** One morpheme segment of a surface token. Segments concatenate exactly to
 * the token as displayed (the last segment carries trailing punctuation).
 * `sandhi` marks a segment that begins a second word fused into this token. */
export const morphSchema = z.object({
  s: z.string(),
  k: morphKindSchema,
  g: z.string().optional(),
  sandhi: z.boolean().optional(),
})
export type Morph = z.output<typeof morphSchema>

/** True when the segments concatenate exactly back to the surface token —
 * the invariant that lets the reader render segments in place of the word. */
export function morphsAlign(surface: string, morphs: Morph[]): boolean {
  return morphs.length > 0 && morphs.map((m) => m.s).join('') === surface
}

/**
 * The morpheme-by-morpheme reading of a segmented word: glossed segments
 * joined with a middle dot, sandhi seams joined with ` + ` ("misery +
 * along·goes"). Null when the segmentation carries no extra information
 * (fewer than two glossed segments) — the caller falls back to the fluent
 * gloss.
 */
export function literalGloss(morphs: Morph[] | undefined): string | null {
  if (!morphs) return null
  const glossed = morphs.filter((m) => m.g)
  if (glossed.length < 2) return null
  return glossed
    .map((m, i) => (i === 0 ? m.g : m.sandhi ? ` + ${m.g}` : `·${m.g}`))
    .join('')
}

/* ------------------------------------------------------------------ */
/* Pali prefixes (upasaggas)                                           */
/* ------------------------------------------------------------------ */

export interface PaliPrefix {
  /** The prefix in its citation form, without the hyphen. */
  form: string
  /** The concrete spatial sense the abstract meanings grew from. */
  imagery: string
  /** Cognates in languages learners are likely to know. */
  cognates: string
  /** A canonical word showing the prefix at work. */
  example: string
}

/**
 * Hand-curated table of the common Pali prefixes: the concrete spatial
 * imagery each one carries into abstract doctrinal vocabulary, with cognates.
 * Fed to the dictionary-entry prompt as ground truth so every entry tells
 * the same story about the same prefix. Kept deliberately conservative —
 * only well-established cognate lines.
 */
export const PALI_PREFIXES: PaliPrefix[] = [
  {
    form: 'a/an',
    imagery: 'not, without — plain negation',
    cognates: 'English un-, Greek a(n)- (atheist, anonymous)',
    example: 'avijjā "non-knowing", ignorance',
  },
  {
    form: 'ati',
    imagery: 'over, beyond, past the mark — excess',
    cognates: 'Greek eti "still, besides", Latin et',
    example: 'atikkamati "goes beyond, transcends"',
  },
  {
    form: 'abhi',
    imagery: 'toward and over — facing something, bearing down on it',
    cognates: 'Latin ob- (observe, obtain)',
    example: 'abhiññā "over-knowing", higher knowledge',
  },
  {
    form: 'adhi',
    imagery: 'on top of, above, presiding over',
    cognates: 'Sanskrit adhi; no common European cognate',
    example: 'adhicitta "higher mind"',
  },
  {
    form: 'anu',
    imagery: 'along after, trailing behind, following the track of',
    cognates: 'Greek ana- (in the sense "along, up through")',
    example: 'anussati "remembering-along", recollection',
  },
  {
    form: 'apa',
    imagery: 'away, off',
    cognates: 'Greek apo-, Latin ab-, English of/off',
    example: 'apeti "goes away"',
  },
  {
    form: 'ā',
    imagery: 'toward the speaker, up to and until — reverses motion verbs',
    cognates: 'Sanskrit ā; no common European cognate',
    example: 'āgacchati "comes" (√gam "go" turned around)',
  },
  {
    form: 'ava/o',
    imagery: 'down, downward, off',
    cognates: 'Latin au- (aufero "carry off")',
    example: 'avakkanti "descent (into the womb)"',
  },
  {
    form: 'du(r)',
    imagery: 'bad, hard, gone wrong',
    cognates: 'Greek dys- (dysfunction, dystopia)',
    example: 'dukkha "suffering", duggati "bad destination"',
  },
  {
    form: 'ni',
    imagery: 'down, into',
    cognates: 'English nether, German nieder',
    example: 'nisīdati "sits down"',
  },
  {
    form: 'nis/nir',
    imagery: 'out of, away from, without',
    cognates: 'Sanskrit nis; no common European cognate',
    example: 'nibbāna: nis + vāna, the fire blown out',
  },
  {
    form: 'pa',
    imagery: 'forward, forth, out ahead — often intensifying',
    cognates: 'Greek/Latin pro-, English forth, for-',
    example: 'pajānāti "knows distinctly" (knowing that steps forth)',
  },
  {
    form: 'pari',
    imagery: 'around, all the way round — completeness',
    cognates: 'Greek peri- (perimeter)',
    example: 'pariññā "full understanding (knowing all around)"',
  },
  {
    form: 'paṭi',
    imagery: 'back, against, in return, counter to',
    cognates: 'Greek proti/pros "toward, against"',
    example: 'paṭiccasamuppāda "dependent (leaning-back) co-arising"',
  },
  {
    form: 'sam/saṁ',
    imagery: 'together, with, completely — things brought into one',
    cognates: 'English same, Greek homo-, Latin similis; works like Latin con-',
    example: 'samādhi: saṁ + ā + √dhā "placing together", collectedness',
  },
  {
    form: 'su',
    imagery: 'well, good, easy',
    cognates: 'Greek eu- (eulogy) — the same Indo-European word',
    example: 'sugata "well-gone", an epithet of the Buddha',
  },
  {
    form: 'ud/u',
    imagery: 'up, out, upward and out of',
    cognates: 'English out, German aus',
    example: 'uppajjati "arises (springs up)"',
  },
  {
    form: 'upa',
    imagery: 'up close to, near, alongside — approach',
    cognates: 'Greek hypo-, Latin sub-, English up',
    example: 'upādāna "taking up close", clinging (fuel taken up by fire)',
  },
  {
    form: 'vi',
    imagery: 'apart, asunder, in different directions — also intensive clarity',
    cognates: 'related to dvi "two"; works like Latin dis- (divide)',
    example: 'vipassanā "seeing apart", insight',
  },
]

/** The prefix table as compact prompt lines — ground truth for the LLM so
 * every dictionary entry tells the same story about the same prefix. */
export function paliPrefixReference(): string {
  return PALI_PREFIXES.map(
    (p) => `${p.form}-: ${p.imagery}. Cognates: ${p.cognates}. E.g. ${p.example}.`,
  ).join('\n')
}
