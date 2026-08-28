import { useProjection } from '@intenteffect/react'
import { filterLibrary, textLibrary } from '@interlinear/shared'
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
      to&nbsp;read the Buddha's discourses in&nbsp;Pali — or&nbsp;any text
      in&nbsp;any language — with an&nbsp;<b>interlinear gloss</b> above every
      word. Tap a&nbsp;word for a&nbsp;full <b>dictionary entry</b>: grammar,
      meanings, and etymology, written by&nbsp;an&nbsp;LLM and shared
      by&nbsp;every reader.
    </p>
  )
}

export function Home() {
  const texts = useProjection(textLibrary)

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
        <div className="home__cards">
          {filterLibrary(site, texts.data).map((text) => (
            <TextCard key={text.id} text={text} />
          ))}
        </div>
      )}

      <AddTextForm />
    </div>
  )
}
