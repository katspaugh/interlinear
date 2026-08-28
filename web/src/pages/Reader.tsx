import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProjection, useSend } from '@intenteffect/react'
import {
  defineWord,
  normalizeWord,
  removeText,
  requestGloss,
  suttaCentralUrl,
  textDetail,
  type Word,
} from '@interlinear/shared'
import { adminUiVisible, getAdminToken, setAdminToken } from '../admin.js'
import { isRead, toggleRead, useReadMarks } from '../readMarks.js'
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
  useReadMarks()

  // Imported texts wait unglossed until somebody reads them: opening one
  // queues it for the gloss worker, and the stanzas fill in live. If the
  // queue is full the request fails quietly — the text is still readable,
  // and the next reader retries.
  // The ref remembers which text was requested: navigating to another
  // unglossed text (same mounted component) must request again.
  const glossRequested = useRef<string | null>(null)
  const textId = detail.status === 'ready' ? detail.data?.text.id : undefined
  const textStatus = detail.status === 'ready' ? detail.data?.text.status : undefined
  useEffect(() => {
    if (!textId || textStatus !== 'unglossed' || glossRequested.current === textId)
      return
    glossRequested.current = textId
    void send(requestGloss, { id: textId })
  }, [textId, textStatus, send])

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
  const scUrl = suttaCentralUrl(text)

  // Fired on pointerdown: kick off the server-side lookup before the click
  // even lands, so the entry is a few ms closer when the sidebar opens.
  function prefetchWord(word: Word) {
    const normalized = normalizeWord(word.w)
    if (!normalized || detail.status !== 'ready' || !detail.data) return
    void send(defineWord, {
      lang: detail.data.text.lang,
      word: normalized,
      kind: detail.data.text.kind,
      tier: 'fast',
    })
  }

  // Fired on click: only now open the sidebar, so touch-scrolling over a
  // word doesn't yank it open.
  function selectWord(word: Word) {
    const normalized = normalizeWord(word.w)
    if (!normalized) return
    setSelected({ word: normalized, gloss: word.g || null })
  }

  async function remove() {
    if (!window.confirm(`Delete "${text.title}"?`)) return
    if (!getAdminToken()) {
      const token = window.prompt('Owner passphrase')
      if (!token) return
      setAdminToken(token.trim())
    }
    const result = await send(removeText, { id: text.id })
    if (result.ok) {
      navigate('/')
    } else {
      window.alert(result.error.message)
      if (result.error.code === 'unauthorized') setAdminToken('')
    }
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
          <label className="reader__toggle" title="Remembered in this browser only">
            <input
              type="checkbox"
              checked={isRead(slug)}
              onChange={() => toggleRead(slug)}
            />{' '}
            Read
          </label>
          {!text.builtin && adminUiVisible() && (
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
          {text.translator && (
            <small className="reader__credit">
              Translation: {text.translator}
            </small>
          )}
          {scUrl && (
            <small className="reader__sclink">
              <a href={scUrl} target="_blank" rel="noreferrer">
                Parallels &amp; more translations on SuttaCentral&nbsp;↗
              </a>
            </small>
          )}
        </div>

        {text.status === 'unglossed' && (
          <p className="reader__glossing">
            This text has no word-by-word glosses yet — reading it queues them
            up. They will appear here as they are generated.
          </p>
        )}
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
                onWordDown={prefetchWord}
                selectedWord={selected?.word}
              />
            ) : (
              <div className="reader__raw">{chunk.original}</div>
            )}
            {(showTranslation || !chunk.words) && chunk.translation && (
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
