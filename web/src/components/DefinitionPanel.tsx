import { useProjection, useSend } from '@intenteffect/react'
import {
  defineWord,
  wordDefinition,
  type Definition,
  type DefinitionTier,
} from '@interlinear/shared'
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

  function request(tier: DefinitionTier) {
    void send(defineWord, {
      lang: props.lang,
      word: props.word,
      kind: props.kind,
      tier,
    })
  }

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
          {loading && (
            <div className="definition__spinner">
              <Spinner />
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
              <button className="btn btn_transparent-blue" onClick={() => request('fast')}>
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
              <button className="btn btn_transparent-blue" onClick={() => request('deep')}>
                ⚠ Detailed entry failed — try again
              </button>
            ) : (
              <button
                className="btn btn_transparent-blue"
                disabled={deepPending}
                onClick={() => request('deep')}
              >
                {deepPending ? 'Writing detailed entry…' : 'Load detailed entry'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
