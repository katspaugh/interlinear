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

function Entry(props: { definition: Definition; badge: string | null }) {
  const { definition } = props
  return (
    <div className="definition__entry">
      <h3 className="definition__title">
        {definition.headword}
        {props.badge && <span className="definition__badge">{props.badge}</span>}
      </h3>
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
 * The sidebar dictionary entry for the currently selected word — progressive:
 * for Pali, the near-instant Digital Pāḷi Dictionary entry appears first and
 * the generated entry replaces it when the LLM finishes. Both tiers are
 * cached per word, so each is fetched at most once and then shared by all
 * readers. (The server still supports a 'deep' tier; the UI doesn't request
 * it.)
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
  const fastReady = fastState?.status === 'ready'
  const dpdReady = hasDpd && dpd.status === 'ready' && dpd.data.status === 'ready'

  // Progressive display: DPD's instant entry shows first, and the generated
  // entry replaces it when it lands.
  const showingDpd = !fastReady && dpdReady
  const shown = fastReady ? fastState : showingDpd ? dpd.data : fastState
  const loading = !shown || shown.status === 'none' || shown.status === 'pending'
  const fastFailedBehindDpd =
    showingDpd && (fastState?.status === 'failed' || Boolean(sendError))

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

          {shown?.status === 'failed' && (
            <div className="definition__error">
              <p>⚠ {shown.error}</p>
              <button className="btn btn_transparent-blue" onClick={() => void request('fast')}>
                Try again
              </button>
            </div>
          )}

          {shown?.status === 'ready' && shown.definition && (
            <Entry definition={shown.definition} badge={showingDpd ? 'DPD' : null} />
          )}

          {showingDpd && (
            <p className="definition__source">
              From the{' '}
              <a
                href={`https://www.dpdict.net/?q=${encodeURIComponent(props.word)}`}
                target="_blank"
                rel="noreferrer"
              >
                Digital Pāḷi Dictionary
              </a>
              .{' '}
              {fastFailedBehindDpd ? (
                <>
                  ⚠ The AI entry failed{' '}
                  <button
                    className="btn btn_transparent-blue"
                    onClick={() => void request('fast')}
                  >
                    Try again
                  </button>
                </>
              ) : (
                <span className="definition__writing">Writing the AI entry…</span>
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
