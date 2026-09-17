import { useEffect, useRef, useState } from 'react'
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

/** The verse specimen: a raised leaf with the saffron tab, carrying one
 * stanza set exactly the way the reader sets a text. */
function Epigraph() {
  return (
    <Link to="/text/ovada-patimokkha" className="epigraph paper_tabbed">
      <Words words={EPIGRAPH} />
      <p className="epigraph__translation">
        Not to do any evil, to cultivate the wholesome, to purify one’s own
        mind — this is the teaching of the Buddhas.
      </p>
      <cite className="epigraph__source">
        <span className="epigraph__ref">Dhammapada 183</span>
        <span className="epigraph__cta">Read it →</span>
      </cite>
    </Link>
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

/** How many library entries render initially and per scroll-triggered batch. */
const LIBRARY_BATCH = 50

export function Home() {
  const texts = useProjection(textLibrary)
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(LIBRARY_BATCH)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const searching = query.trim() !== ''
  const sutta = site.id === 'sutta'

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

  // Infinite loading for the card grid: render the listing in windows,
  // growing the window when the sentinel below it nears the viewport. The
  // sutta.stream index windows inside the selected collection instead, so it
  // takes the whole listing and does its own batching.
  const visible = shown.slice(0, visibleCount)
  const hasMore = visibleCount < shown.length

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    // Recreated per batch: observe() fires with the current state, so a
    // sentinel still within the margin keeps loading until it scrolls out.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + LIBRARY_BATCH)
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, visibleCount])

  function onQuery(next: string) {
    setQuery(next)
    setVisibleCount(LIBRARY_BATCH)
  }

  const listing = (
    <>
      {texts.status === 'loading' && <Spinner />}
      {texts.status === 'error' && (
        <p className="home__error" role="alert">
          ⚠ {texts.error.message}
        </p>
      )}
      {texts.status === 'ready' &&
        (sutta ? (
          // The index carries its own search field: on sutta.stream it sits
          // in the sticky collection rail, not centred above the listing.
          <Library
            texts={shown}
            query={query}
            onQuery={onQuery}
            placeholder={site.searchPlaceholder}
          />
        ) : (
          <>
            <div className="home__search">
              <input
                type="search"
                className="home__search-input"
                placeholder={site.searchPlaceholder}
                aria-label="Search the library"
                value={query}
                onChange={(event) => onQuery(event.target.value)}
              />
            </div>
            {shown.length === 0 && searching ? (
              <p className="home__empty">Nothing matches “{query.trim()}”.</p>
            ) : (
              <div className="home__cards">
                {visible.map((text) => (
                  <TextCard key={text.id} text={text} />
                ))}
              </div>
            )}
            {hasMore && (
              <div className="home__more" ref={sentinelRef}>
                <Spinner />
              </div>
            )}
          </>
        ))}
    </>
  )

  // sutta.stream leads with the headline and the verse specimen, and keeps
  // the wordmark up in the header — no second, larger logo beneath it.
  if (sutta) {
    return (
      <div className="container home">
        <div className="hero">
          <p className="hero__eyebrow">The Buddha’s discourses, word by word</p>
          <h1 className="hero__title">
            Read the suttas in Pali,
            <br />
            <em>one word at a time.</em>
          </h1>
          <div className="home__hero">
            <Hero />
          </div>
        </div>

        <Epigraph />
        {listing}

        {adminUiVisible() && <AddTextForm />}
      </div>
    )
  }

  return (
    <div className="container home">
      <div className="home__logo">
        <Logo />
      </div>

      <div className="home__hero">
        <Hero />
      </div>

      {listing}

      {adminUiVisible() && <AddTextForm />}
    </div>
  )
}
