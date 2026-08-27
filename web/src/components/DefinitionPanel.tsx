import { useProjection, useSend } from '@intenteffect/react'
import { defineWord, wordDefinition } from '@interlinear/shared'
import { Spinner } from './Spinner.js'

/**
 * The sidebar dictionary entry for the currently selected word.
 * The projection snapshot returns the cached entry instantly; a fresh
 * lookup arrives as a `word.defined` event once the LLM worker finishes.
 */
export function DefinitionPanel(props: {
  lang: string
  kind: string
  word: string
  gloss: string | null
}) {
  const send = useSend()
  const state = useProjection(wordDefinition, { lang: props.lang, word: props.word })

  const loading =
    state.status === 'loading' ||
    (state.status === 'ready' &&
      (state.data.status === 'none' || state.data.status === 'pending'))

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

          {state.status === 'error' && (
            <p className="definition__error">⚠ {state.error.message}</p>
          )}

          {state.status === 'ready' && state.data.status === 'failed' && (
            <div className="definition__error">
              <p>⚠ {state.data.error}</p>
              <button
                className="btn btn_transparent-blue"
                onClick={() =>
                  void send(defineWord, {
                    lang: props.lang,
                    word: props.word,
                    kind: props.kind,
                  })
                }
              >
                Try again
              </button>
            </div>
          )}

          {state.status === 'ready' &&
            state.data.status === 'ready' &&
            state.data.definition && (
              <div className="definition__entry">
                <h3 className="definition__title">{state.data.definition.headword}</h3>
                <p className="definition__grammar">{state.data.definition.grammar}</p>
                <ol className="definition__meanings">
                  {state.data.definition.meanings.map((meaning, i) => (
                    <li key={i}>{meaning}</li>
                  ))}
                </ol>
                {state.data.definition.analysis && (
                  <p>
                    <b>Analysis.</b> {state.data.definition.analysis}
                  </p>
                )}
                {state.data.definition.etymology && (
                  <p>
                    <b>Etymology.</b> {state.data.definition.etymology}
                  </p>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
