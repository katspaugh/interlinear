import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjection } from '@intenteffect/react'
import { filterLibrary, searchLibrary, textLibrary, type Word } from '@interlinear/shared'
import { adminUiVisible } from '../admin.js'
import { Logo } from '../App.js'
import { AddTextForm } from '../components/AddTextForm.js'
import { Library } from '../components/Library.js'
import { Spinner } from '../components/Spinner.js'
import { TextCard } from '../components/TextCard.js'
import { Words } from '../components/Words.js'
import { site } from '../site.js'

/** Dhammapada 183 (a seed text) as sutta.stream's hero — the product,
 * shown rather than described. Links into the reader. */
const EPIGRAPH: Word[] = [
  { w: 'Sabbapāpassa', g: 'of all evil' },
  { w: 'akaraṇaṃ,', g: 'the non-doing' },
  { w: 'kusalassa', g: 'of the wholesome' },
  { w: 'upasampadā;', g: 'the undertaking', nl: true },
  { w: 'Sacittapariyodapanaṃ,', g: 'purifying one’s own mind' },
  { w: 'etaṃ', g: 'this' },
  { w: 'buddhāna', g: 'of the Buddhas' },
  { w: 'sāsanaṃ.', g: 'the teaching' },
]

function Epigraph() {
  return (
    <Link to="/text/ovada-patimokkha" className="epigraph">
      <Words words={EPIGRAPH} />
      <p className="epigraph__translation">
        Not to do any evil, to cultivate the wholesome, to purify one’s own
        mind — this is the teaching of the Buddhas.
      </p>
      <cite className="epigraph__source">Dhammapada 183 — read it →</cite>
    </Link>
  )
}

function Waves() {
  return (
    <svg className="home__waves" viewBox="0 0 80 14" aria-hidden="true">
      <path
        d="M4 8c8-6 16 6 24 0s16 6 24 0 16 6 24 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
      {site.id === 'sutta' && (
        <p className="home__tagline">The Buddha’s discourses, word by word</p>
      )}

      {site.id === 'sutta' && <Epigraph />}

      <div className="home__hero">
        <Hero />
      </div>

      {site.id === 'sutta' && <Waves />}

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
          ) : site.groupedLibrary ? (
            <Library texts={shown} />
          ) : (
            <div className="home__cards">
              {shown.map((text) => (
                <TextCard key={text.id} text={text} />
              ))}
            </div>
          )}
        </>
      )}

      {adminUiVisible() && <AddTextForm />}
    </div>
  )
}
