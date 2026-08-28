/**
 * Presets for specific types of texts. A preset tunes how the LLM glosses,
 * translates, and defines words — scripture wants doctrinal precision,
 * poetry wants register, technical documentation wants terminological
 * consistency.
 */

export interface TextKindPreset {
  id: string
  label: string
  /** Extra guidance appended to the glossing system prompt. */
  glossHint: string
  /** Extra guidance appended to the dictionary-entry system prompt. */
  definitionHint: string
}

export const TEXT_KINDS: TextKindPreset[] = [
  {
    id: 'sutta',
    label: 'Sutta / scripture',
    glossHint:
      'This is Buddhist scripture. Use established doctrinal renderings; well-known untranslatable terms (dhamma, kamma, nibbāna, jhāna) may be kept with a one-word hint. Respect formulaic repetition — repeat glosses verbatim for repeated formulas. The translation should be clear, measured, and faithful to the doctrinal content.',
    definitionHint:
      'Emphasize the word’s doctrinal usage in the canon (with the tradition’s established English renderings) in the style of the PTS dictionary. Pali opens up through morphology: relate roots to their Sanskrit forms and Indo-European cognates, and show how spatial prefixes (upa-, sam-, abhi-, paṭi-, vi-, ni-) keep their concrete imagery inside abstract doctrinal terms — e.g. samādhi as saṁ + ā + √dhā, "placing together", hence collectedness.',
  },
  {
    id: 'poetry',
    label: 'Poetry',
    glossHint:
      'This is poetry. Gloss the literal sense of each word; the translation may be freer in order to carry imagery, register, and rhythm, but must stay accurate. Preserve the line structure in spirit.',
    definitionHint:
      'Note poetic, archaic, or elevated usage where relevant, alongside the plain meanings.',
  },
  {
    id: 'prose',
    label: 'Prose',
    glossHint:
      'This is general prose. Gloss plainly and translate into natural, contemporary English.',
    definitionHint: '',
  },
  {
    id: 'technical',
    label: 'Technical documentation',
    glossHint:
      'This is technical documentation. Use precise, consistent terminology — the same term must always get the same gloss. Keep the translation literal and unambiguous rather than elegant.',
    definitionHint:
      'Focus on the term’s technical meaning in context; include the everyday meaning only as a secondary sense.',
  },
  {
    id: 'fiction',
    label: 'Fiction',
    glossHint:
      'This is fiction. Gloss the contextual sense of each word (including idioms and colloquialisms), and translate into natural, idiomatic narrative English that preserves tone and voice.',
    definitionHint:
      'Include colloquial and idiomatic senses, and note the register (formal, colloquial, slang) of the word.',
  },
]

export const DEFAULT_KIND = 'prose'

export function textKindPreset(id: string): TextKindPreset {
  return TEXT_KINDS.find((k) => k.id === id) ?? TEXT_KINDS.find((k) => k.id === DEFAULT_KIND)!
}
