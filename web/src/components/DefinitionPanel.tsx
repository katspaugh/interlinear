import { useEffect, useState } from 'react'
import { useProjection, useSend } from '@intenteffect/react'
import {
  defineWord,
  wordDefinition,
  type Definition,
  type DefinitionTier,
} from '@interlinear/shared'
import { isKnown, toggleKnown, useWordKnowledge } from '../knownWords.js'
import { Spinner } from './Spinner.js'

function Entry(props: { definition: Definition; detailed: boolean }) {
  const { definition } = props
  return (
    <div className="definition__entry">
      <h3 className="definition__title">
        {definition.headword}
        {props.detailed && <span className="definition__badge">detailed</span>}
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
 * The sidebar dictionary entry for the currently selected word.
 * A quick entry is generated on tap; the "Load detailed entry" button
 * requests a richer one from a larger model. Both are cached per word,
 * so each tier is generated at most once and then shared by all readers.
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
  const fast = useProjection(wordDefinition, {
    lang: props.lang,
    word: props.word,
    tier: 'fast',
  })
  const deep = useProjection(wordDefinition, {
    lang: props.lang,
    word: props.word,
    tier: 'deep',
  })
  const [sendError, setSendError] = useState<string | null>(null)

  async function request(tier: DefinitionTier) {
    const result = await send(defineWord, {
      lang: props.lang,
      word: props.word,
      kind: props.kind,
      tier,
    })
    setSendError(result.ok ? null : result.error.message)
  }

  // The reader prefetches the fast tier on pointerdown, but that send is
  // fire-and-forget; re-request here (deduped server-side) so failures like
  // the daily dictionary budget surface in the panel instead of spinning.
  useEffect(() => {
    setSendError(null)
    void request('fast')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang, props.word])

  const deepReady = deep.status === 'ready' && deep.data.status === 'ready'
  const deepPending = deep.status === 'ready' && deep.data.status === 'pending'
  const shown = deepReady ? deep.data : fast.status === 'ready' ? fast.data : null
  const loading = !shown || shown.status === 'none' || shown.status === 'pending'

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

          {(fast.status === 'error' || deep.status === 'error') && (
            <p className="definition__error">
              ⚠ {(fast.status === 'error' ? fast.error : (deep as { error: { message: string } }).error).message}
            </p>
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
            <Entry definition={shown.definition} detailed={deepReady} />
          )}
        </div>

        {shown?.status === 'ready' && !deepReady && (
          <div className="definition__more">
            {deep.status === 'ready' && deep.data.status === 'failed' ? (
              <button className="btn btn_transparent-blue" onClick={() => void request('deep')}>
                ⚠ Detailed entry failed — try again
              </button>
            ) : (
              <button
                className="btn btn_transparent-blue"
                disabled={deepPending}
                onClick={() => void request('deep')}
              >
                {deepPending ? 'Writing detailed entry…' : 'Load detailed entry'}
              </button>
            )}
          </div>
        )}

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
