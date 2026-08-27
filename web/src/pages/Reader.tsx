import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProjection, useSend } from '@intenteffect/react'
import {
  defineWord,
  normalizeWord,
  removeText,
  textDetail,
  type Word,
} from '@interlinear/shared'
import { DefinitionPanel } from '../components/DefinitionPanel.js'
import { Spinner } from '../components/Spinner.js'
import { Words } from '../components/Words.js'

interface SelectedWord {
  word: string
  gloss: string | null
}

export function Reader() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const send = useSend()
  const detail = useProjection(textDetail, { slug })
  const [showGlosses, setShowGlosses] = useState(true)
  const [showTranslation, setShowTranslation] = useState(false)
  const [selected, setSelected] = useState<SelectedWord | null>(null)

  if (detail.status === 'loading') return <Spinner />
  if (detail.status === 'error') {
    return (
      <p className="reader__error" role="alert">
        ⚠ {detail.error.message}
      </p>
    )
  }
  if (!detail.data) {
    return (
      <div className="reader__missing">
        <p>This text does not exist (anymore).</p>
        <Link to="/">Back to the library</Link>
      </div>
    )
  }

  const { text, chunks } = detail.data

  function selectWord(word: Word) {
    const normalized = normalizeWord(word.w)
    if (!normalized || detail.status !== 'ready' || !detail.data) return
    setSelected({ word: normalized, gloss: word.g || null })
    void send(defineWord, {
      lang: detail.data.text.lang,
      word: normalized,
      kind: detail.data.text.kind,
    })
  }

  async function remove() {
    if (!window.confirm(`Delete "${text.title}"?`)) return
    const result = await send(removeText, { id: text.id })
    if (result.ok) navigate('/')
  }

  return (
    <div className="container reader">
      <div className="reader__text">
        <div className="reader__controls">
          <label className="reader__toggle">
            <input
              type="checkbox"
              checked={showGlosses}
              onChange={(e) => setShowGlosses(e.target.checked)}
            />{' '}
            Word glosses
          </label>
          <label className="reader__toggle">
            <input
              type="checkbox"
              checked={showTranslation}
              onChange={(e) => setShowTranslation(e.target.checked)}
            />{' '}
            Translation
          </label>
          {!text.builtin && (
            <button className="reader__delete" onClick={() => void remove()}>
              🗑 Delete text
            </button>
          )}
        </div>

        <div className="reader__heading">
          {text.source && <cite className="reader__source">{text.source}</cite>}
          <h3 className="reader__title">{text.origTitle ?? text.title}</h3>
          <small className="reader__subtitle">
            {text.origTitle ? text.title : text.lang}
          </small>
        </div>

        {text.status === 'glossing' && (
          <p className="reader__glossing">
            Glossing {text.glossedCount}/{text.chunkCount} — new stanzas appear as
            they are glossed.
          </p>
        )}
        {text.status === 'failed' && (
          <p className="reader__failed" role="alert">
            ⚠ Glossing did not finish. The original text is shown below.
          </p>
        )}

        {chunks.map((chunk) => (
          <div className="reader__chunk" key={chunk.idx}>
            {chunk.words ? (
              <Words
                words={chunk.words}
                showGlosses={showGlosses}
                onWordClick={selectWord}
                selectedWord={selected?.word}
              />
            ) : (
              <div className="reader__raw">{chunk.original}</div>
            )}
            {showTranslation && chunk.translation && (
              <p className="reader__translation">{chunk.translation}</p>
            )}
          </div>
        ))}
      </div>

      <div className={`reader__sidebar ${selected ? 'reader__sidebar_active' : ''}`}>
        <div className="reader__sidebar-inner">
          {selected ? (
            <DefinitionPanel
              lang={text.lang}
              kind={text.kind}
              word={selected.word}
              gloss={selected.gloss}
            />
          ) : (
            <p className="reader__sidebar-hint">
              Tap any word for its dictionary entry.
            </p>
          )}
          <button
            className="reader__sidebar-close"
            onClick={() => setSelected(null)}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
