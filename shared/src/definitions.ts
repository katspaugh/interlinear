/**
 * Dictionary-entry composition shared by the React sidebar and the lite
 * (no-JavaScript) word page: the two cached tiers — the Digital Pāḷi
 * Dictionary's instant entry and the LLM's — are complementary, so a word
 * that has both is shown as one merged entry rather than two.
 */

import type { Definition } from './contracts.js'

/**
 * Merge the DPD entry with the LLM ('fast') entry for the same word. DPD
 * keeps headword and meanings — those are the authoritative ones — while
 * grammar stays DPD's when it is a real inflection reading ("voc pl of
 * bhikkhu") and otherwise yields to the LLM's fuller analysis over a bare
 * part-of-speech label ("sandhi"). Morphemes and etymology are the LLM's
 * alone. Returns whichever entry exists when only one does, and null when
 * neither has arrived yet.
 */
export function mergeDefinitions(
  dpd: Definition | null,
  llm: Definition | null,
): Definition | null {
  if (!dpd || !llm) return llm ?? dpd
  return {
    headword: dpd.headword,
    grammar: dpd.grammar.includes(' of ') ? dpd.grammar : llm.grammar || dpd.grammar,
    meanings: dpd.meanings,
    analysis: llm.analysis ?? dpd.analysis,
    etymology: llm.etymology,
    morphemes: llm.morphemes,
  }
}
