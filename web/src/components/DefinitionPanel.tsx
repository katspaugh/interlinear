import { useEffect, useState } from 'react'
import { useProjection, useSend } from '@intenteffect/react'
import {
  defineWord,
  langHasDpd,
  wordDefinition,
  type Definition,
  type DefinitionTier,
} from '@interlinear/shared'
import { isKnown, toggleKnown, useWordKnowledge } from '../knownWords.js'
import { Spinner } from './Spinner.js'

function Entry(props: { definition: Definition }) {
  const { definition } = props
  return (
    <div className="definition__entry">
      <h3 className="definition__title">{definition.headword}</h3>
      <p className="definition__grammar">{definition.grammar}</p>
      <ol className="definition__meanings">
        {definition.meanings.map((meaning, i) => (
          <li key={i}>{meaning}</li>
        ))}
      </ol>
      {definition.morphemes && definition.morphemes.length > 0 && (
        <div className="definition__morphs">
          <h4 className="definition__morphs-heading">Built from</h4>
          {definition.morphemes.map((morpheme, i) => (
            <div className="definition__morph" key={i}>
              <span className={`definition__morph-chip definition__morph-chip_${morpheme.kind}`}>
                {morpheme.part}
              </span>
              <span className="definition__morph-body">
                <span className="definition__morph-kind">
                  {morpheme.kind} · {morpheme.gloss}
                </span>
                {morpheme.note}
              </span>
            </div>
          ))}
        </div>
      )}
      {definition.analysis && (
        <p>
          <b>Analysis.</b> {definition.analysis}
        </p>
      )}
      {definition.etymology && (
        <p>
          <b>Etymology.</b> {definition.etymology}
        </p>
      )}
    </div>
  )
}

/**
 * The sidebar dictionary entry for the currently selected word — progressive
 * and complementary: for Pali, the near-instant Digital Pāḷi Dictionary
 * entry appears first with the authoritative meanings and grammar, and when
 * the LLM finishes, its complementary sections (morphemes, etymology,
 * compound analysis) extend the same entry in place. Both tiers are cached
 * per word, so each is fetched at most once and then shared by all readers.
 * (The server still supports a 'deep' tier; the UI doesn't request it.)
 */
export function DefinitionPanel(props: {
  lang: string
  kind: string
  word: string
  gloss: string | null
}) {
  const send = useSend()
  useWordKnowledge()
  const known = isKnown(props.lang, props.word)
  const hasDpd = langHasDpd(props.lang)
  const dpd = useProjection(wordDefinition, {
    lang: props.lang,
    word: props.word,
    tier: 'dpd',
  })
  const entry = useProjection(wordDefinition, {
    lang: props.lang,
    word: props.word,
    tier: 'fast',
  })
  const [sendError, setSendError] = useState<string | null>(null)

  async function request(tier: DefinitionTier) {
    const result = await send(defineWord, {
      lang: props.lang,
      word: props.word,
      kind: props.kind,
      tier,
    })
    // A DPD miss or hiccup is a normal outcome (the LLM entry covers it) —
    // only LLM-tier failures block the panel.
    if (tier !== 'dpd') setSendError(result.ok ? null : result.error.message)
  }

  // The reader prefetches the entry on pointerdown, but that send is
  // fire-and-forget; re-request here (deduped server-side) so failures like
  // the daily dictionary budget surface in the panel instead of spinning.
  useEffect(() => {
    setSendError(null)
    if (hasDpd) void request('dpd')
    void request('fast')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang, props.word])

  const fastState = entry.status === 'ready' ? entry.data : null
  const fastEntry = fastState?.status === 'ready' ? fastState.definition : null
  const dpdEntry =
    hasDpd && dpd.status === 'ready' && dpd.data.status === 'ready'
      ? dpd.data.definition
      : null

  // Progressive, complementary display: DPD's instant entry shows first with
  // the authoritative basics, and the LLM's complementary sections extend it
  // in place when they land. DPD keeps headword and meanings; grammar stays
  // DPD's when it is a real inflection reading ("voc pl of bhikkhu"), else
  // the LLM's fuller analysis wins over a bare pos label ("sandhi").
  const merged: Definition | null =
    dpdEntry && fastEntry
      ? {
          headword: dpdEntry.headword,
          grammar: dpdEntry.grammar.includes(' of ')
            ? dpdEntry.grammar
            : fastEntry.grammar || dpdEntry.grammar,
          meanings: dpdEntry.meanings,
          analysis: fastEntry.analysis ?? dpdEntry.analysis,
          etymology: fastEntry.etymology,
          morphemes: fastEntry.morphemes,
        }
      : null
  const shownEntry = merged ?? fastEntry ?? dpdEntry
  const loading = !shownEntry && fastState?.status !== 'failed'
  const fastFailedBehindDpd =
    Boolean(dpdEntry) &&
    !fastEntry &&
    (fastState?.status === 'failed' || Boolean(sendError))

  return (
    <div className="definition">
      <h3 className="definition__heading">Dictionary</h3>

      <div className="definition__panel">
        <div className="definition__term">
          <span className="definition__term-text">{props.word}</span>
          {props.gloss && (
            <>
              {' – '}
              <span className="definition__term-note">{props.gloss}</span>
            </>
          )}
        </div>

        <div className="definition__sections">
          {loading && !sendError && (
            <div className="definition__spinner">
              <Spinner />
            </div>
          )}

          {loading && sendError && (
            <div className="definition__error">
              <p>⚠ {sendError}</p>
              <button className="btn btn_transparent-blue" onClick={() => void request('fast')}>
                Try again
              </button>
            </div>
          )}

          {entry.status === 'error' && (
            <p className="definition__error">⚠ {entry.error.message}</p>
          )}

          {!dpdEntry && fastState?.status === 'failed' && (
            <div className="definition__error">
              <p>⚠ {fastState.error}</p>
              <button className="btn btn_transparent-blue" onClick={() => void request('fast')}>
                Try again
              </button>
            </div>
          )}

          {shownEntry && <Entry definition={shownEntry} />}

          {dpdEntry && (
            <p className="definition__source">
              {merged ? 'Meanings from the ' : 'From the '}
              <a
                href={`https://www.dpdict.net/?q=${encodeURIComponent(props.word)}`}
                target="_blank"
                rel="noreferrer"
              >
                Digital Pāḷi Dictionary
              </a>
              {merged ? '; morphology and etymology by Claude.' : '.'}{' '}
              {fastFailedBehindDpd ? (
                <>
                  ⚠ The AI extension failed{' '}
                  <button
                    className="btn btn_transparent-blue"
                    onClick={() => void request('fast')}
                  >
                    Try again
                  </button>
                </>
              ) : (
                !merged && (
                  <span className="definition__writing">
                    Adding morphology and etymology…
                  </span>
                )
              )}
            </p>
          )}
        </div>

        <div className="definition__known">
          <button
            className={`btn btn_transparent-blue ${known ? 'definition__known-btn_active' : ''}`}
            aria-pressed={known}
            onClick={() => toggleKnown(props.lang, props.word)}
          >
            {known ? '✓ Known — gloss hidden' : 'I know this word'}
          </button>
          <p className="definition__known-hint">
            {known
              ? 'Its gloss is faded out everywhere; hover the word to peek. Remembered in this browser only.'
              : 'Fades its gloss out in every text, so the page slowly becomes bare ' +
                props.lang +
                '.'}
          </p>
        </div>
      </div>
    </div>
  )
}
