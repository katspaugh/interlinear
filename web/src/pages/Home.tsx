import { useState } from 'react'
import { useProjection } from '@intenteffect/react'
import { filterLibrary, searchLibrary, textLibrary } from '@interlinear/shared'
import { Logo } from '../App.js'
import { AddTextForm } from '../components/AddTextForm.js'
import { Spinner } from '../components/Spinner.js'
import { TextCard } from '../components/TextCard.js'
import { site } from '../site.js'

function Hero() {
  if (site.id === 'sutta') {
    return (
      <p>
        Read the Buddha's discourses as&nbsp;they were spoken — in&nbsp;Pali,
        with an&nbsp;<b>interlinear gloss</b> above every word. Tap
        a&nbsp;word for a&nbsp;full <b>dictionary entry</b>: grammar,
        meanings, doctrinal usage, and etymology. What does <i>sati</i>{' '}
        actually mean? See for yourself.
      </p>
    )
  }
  return (
    <p>
      Languages are best learned by&nbsp;reading. We&nbsp;built this place
      to&nbsp;read texts in&nbsp;their original language — any text,
      any&nbsp;language — with an&nbsp;<b>interlinear gloss</b> above every
      word. Tap a&nbsp;word for a&nbsp;full <b>dictionary entry</b>: grammar,
      meanings, and etymology, written by&nbsp;an&nbsp;LLM and shared
      by&nbsp;every reader.
    </p>
  )
}

export function Home() {
  const texts = useProjection(textLibrary)
  const [query, setQuery] = useState('')
  const searching = query.trim() !== ''

  // A search reaches past the home-page kind caps (interlinear.cc features
  // only a taste of the suttas, but "dhammapada" should still find them
  // all); onlyKind stays — sutta.stream searches suttas only.
  const shown =
    texts.status === 'ready'
      ? searchLibrary(
          filterLibrary(searching ? { ...site, kindCaps: undefined } : site, texts.data),
          query,
        )
      : []

  return (
    <div className="container home">
      <div className="home__logo">
        <Logo />
      </div>

      <div className="home__hero">
        <Hero />
      </div>

      {texts.status === 'loading' && <Spinner />}
      {texts.status === 'error' && (
        <p className="home__error" role="alert">
          ⚠ {texts.error.message}
        </p>
      )}
      {texts.status === 'ready' && (
        <>
          <div className="home__search">
            <input
              type="search"
              className="home__search-input"
              placeholder={site.searchPlaceholder}
              aria-label="Search the library"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {shown.length === 0 && searching ? (
            <p className="home__empty">Nothing matches “{query.trim()}”.</p>
          ) : (
            <div className="home__cards">
              {shown.map((text) => (
                <TextCard key={text.id} text={text} />
              ))}
            </div>
          )}
        </>
      )}

      <AddTextForm />
    </div>
  )
}
