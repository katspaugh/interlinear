import { useEffect } from 'react'
import { Link } from 'react-router-dom'

/**
 * sutta.stream's style guide — the browsable version of theme-sutta.css.
 *
 * It renders the real classes wherever one exists (.word, .index__row,
 * .badge, .reader__seg, .definition__*), so it documents what the site
 * actually does rather than a copy that drifts from it. Its own layout
 * lives under .ds__*.
 *
 * Unlinked from the site's navigation: this is for whoever is building it.
 */

const PRINCIPLES = [
  {
    n: '01',
    title: 'Pali is the largest thing on screen',
    body: 'Glosses, labels and controls all sit below it in size and contrast. Never the reverse.',
  },
  {
    n: '02',
    title: 'Hairlines, not boxes',
    body: 'A single 1px rule in #e4dccc separates things. Fills and shadows are reserved for paper cards.',
  },
  {
    n: '03',
    title: 'One accent, used sparingly',
    body: 'Saffron marks the current thing and the one action. If everything is accented, nothing is.',
  },
  {
    n: '04',
    title: 'The page should empty over time',
    body: 'As words are learned their glosses fade. The interface is designed to be outgrown.',
  },
]

const COLORS = [
  { name: 'Paper', hex: '#efebe3', note: 'page ground', ruled: true },
  { name: 'Leaf', hex: '#fbf8f2', note: 'raised cards', ruled: true },
  { name: 'Ink', hex: '#2b2620', note: 'primary text' },
  { name: 'Ink soft', hex: '#6b6257', note: 'body, translation' },
  { name: 'Ash', hex: '#a39a8c', note: 'glosses, labels' },
  { name: 'Saffron', hex: '#c58a2e', note: 'marks, rules' },
  { name: 'Terracotta', hex: '#a8672f', note: 'links, actions' },
  { name: 'Highlight', hex: '#f3e6c8', note: 'selected word', ruled: true },
]

const SCALE: { label: string; sample: string; style: React.CSSProperties }[] = [
  {
    label: 'Display / 300 · 86px',
    sample: 'Read the suttas',
    style: {
      font: '300 clamp(40px, 5vw, 60px)/1.03 var(--font-reading)',
      letterSpacing: '-.025em',
    },
  },
  {
    label: 'Title / 400 · 30px',
    sample: 'Khuddakapāṭha',
    style: { font: '400 30px/1.1 var(--font-reading)', letterSpacing: '-.01em' },
  },
  {
    label: 'Pali / 400 · 34px',
    sample: 'saraṇaṃ gacchāmi',
    style: { font: '400 34px/1.15 var(--font-reading)' },
  },
  {
    label: 'Lead / 300 · 20px',
    sample: 'An interlinear gloss above every word.',
    style: { font: '300 20px/1.6 var(--font-reading)', color: 'var(--ink-soft)' },
  },
  {
    label: 'Translation / italic 300 · 19px',
    sample: 'I go to the Buddha for refuge.',
    style: { font: 'italic 300 19px/1.65 var(--font-reading)', color: 'var(--muted)' },
  },
  {
    label: 'Body / 400 · 16px',
    sample: 'goes; walks; moves; wanders around; travels',
    style: { font: '400 16px/1.55 var(--font-reading)', color: 'var(--ink-body)' },
  },
  {
    label: 'Gloss / Sora 500 · 11px',
    sample: 'for the second time too',
    style: {
      font: '500 11px/1 var(--font-ui)',
      letterSpacing: '.04em',
      color: 'var(--gloss)',
    },
  },
  {
    label: 'Label / Sora 500 · 11px',
    sample: 'Dictionary',
    style: {
      font: '500 11px/1 var(--font-ui)',
      letterSpacing: '.18em',
      textTransform: 'uppercase',
      color: 'var(--gloss)',
    },
  },
]

const ENTRY_BLOCKS = [
  {
    title: 'Inflected form + gloss',
    body: 'Saffron left rule. The word exactly as it appears in the text.',
  },
  { title: 'Lemma + grammar', body: 'Dictionary headword, then the parse in italic.' },
  { title: 'Numbered senses', body: 'Literal first, doctrinal second.' },
  {
    title: 'Built from',
    body: 'Morpheme chips with kind and note. Omitted for simple words.',
  },
  { title: 'Etymology', body: 'Root, Sanskrit, PIE, cognates. Prose, not a table.' },
  {
    title: 'Mark as known',
    body: 'The one action in the panel, with a line explaining what it does.',
  },
]

const LAYOUT = [
  { value: '70ch', note: 'Max measure for interlinear text. Prose caps at 56–62ch.' },
  { value: '1fr / 320', note: 'Reader columns: text, dictionary. 56px gap.' },
  { value: '96px', note: 'Between major sections. 44px between passages, 14px within one.' },
  { value: '2px / 3px', note: 'Radii only. Controls 2px, paper 3px. Nothing is round.' },
]

function Section(props: { title: string; aside: string; children: React.ReactNode }) {
  return (
    <section className="ds__section">
      <div className="ds__section-head">
        <h2>{props.title}</h2>
        <span className="ds__aside">{props.aside}</span>
      </div>
      {props.children}
    </section>
  )
}

/** One interlinear word in a given state, built from the reader's own
 * classes so the states here are the states there. */
function WordState(props: { className: string; label: string; gloss?: boolean }) {
  return (
    <span className="ds__word">
      <span className={`words words_morphs ${props.gloss === false ? 'words_hide-glosses' : ''}`}>
        <span className={props.className}>
          <span className="word__gloss">I go</span>
          <span className="word__text">gacchāmi</span>
        </span>
      </span>
      <span className="ds__word-label">{props.label}</span>
    </span>
  )
}

export function DesignSystem() {
  // The guide documents sutta.stream's skin, so it renders in that skin
  // whatever host it is opened on — and leaves the class as it found it.
  useEffect(() => {
    const root = document.documentElement
    const had = root.classList.contains('theme-sutta')
    if (!had) root.classList.add('theme-sutta')
    return () => {
      if (!had) root.classList.remove('theme-sutta')
    }
  }, [])

  return (
    <div className="ds">
      <div className="ds__header">
        <h1 className="header__logo">
          <Link to="/">
            sutta<span className="logo__dot">.</span>stream
          </Link>
        </h1>
        <span className="ds__aside">Design System · v1</span>
      </div>

      <div className="ds__body">
        <div className="ds__lede">
          <p className="hero__eyebrow">Style guide</p>
          <h2 className="hero__title">
            The paper, the ink,
            <br />
            <em>and everything on it.</em>
          </h2>
          <p className="ds__lead">
            A reading surface, not an app. Warm paper ground, one hairline weight, one
            accent, and type that carries the hierarchy. Chrome stays quiet so the Pali
            can be loud.
          </p>
        </div>

        <Section title="Principles" aside="Four rules">
          <div className="ds__grid ds__grid_wide">
            {PRINCIPLES.map((principle) => (
              <div className="ds__principle" key={principle.n}>
                <span className="ds__ordinal">{principle.n}</span>
                <span className="ds__principle-title">{principle.title}</span>
                <span className="ds__note">{principle.body}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Color" aside="Paper · Ink · Saffron">
          <div className="ds__swatches">
            {COLORS.map((color) => (
              <div key={color.hex}>
                <div
                  className={`ds__swatch ${color.ruled ? 'ds__swatch_ruled' : ''}`}
                  style={{ background: color.hex }}
                />
                <div className="ds__swatch-body">
                  <span className="ds__swatch-name">{color.name}</span>
                  <span className="ds__note">
                    {color.hex} · {color.note}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="ds__note ds__note_wide">
            Hairlines: <b>#ddd6c9</b> on paper, <b>#e4dccc</b> on card edges, <b>#eee7d9</b>{' '}
            for internal dividers. Nothing else draws a line.
          </p>
        </Section>

        <Section title="Type" aside="Newsreader + Sora">
          <div className="ds__grid">
            <div className="ds__family">
              <span className="ds__label">Newsreader · everything read</span>
              <span className="ds__family-sample">Aa Ññ Ṃṃ Ṭṭ</span>
              <span className="ds__note">
                Full diacritic coverage for romanized Pali. Weights 300 / 400 / 500,
                italic for translation and subtitles.
              </span>
            </div>
            <div className="ds__family">
              <span className="ds__label">Sora · everything clicked</span>
              <span className="ds__family-sample ds__family-sample_ui">Aa 01 →</span>
              <span className="ds__note">
                Only at 10–12px, uppercase, .14–.2em tracking. Labels, chips, numbers,
                metadata. Never for prose.
              </span>
            </div>
          </div>

          <div className="ds__scale">
            {SCALE.map((row) => (
              <div className="ds__scale-row" key={row.label}>
                <span className="ds__scale-label">{row.label}</span>
                <span style={row.style}>{row.sample}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Interlinear word" aside="The core unit">
          <div className="ds__specimen">
            <WordState className="word word_clickable" label="Default" />
            <WordState className="word word_clickable ds__word_hover" label="Hover" />
            <WordState className="word word_clickable word_selected" label="Selected" />
            <WordState
              className="word word_clickable word_known word_occur_4"
              label="Known · bare"
            />
          </div>
          <p className="ds__note ds__note_wide">
            The gloss sits above at 11px so the eye lands on the Pali first. A word the
            segmenter could not split takes the plain 2px seam in <b>#d9c79a</b>; a
            segmented word is underlined by morpheme instead —{' '}
            <span className="word__morph word__morph_prefix">prefix</span>,{' '}
            <span className="word__morph word__morph_root">root</span>,{' '}
            <span className="word__morph word__morph_stem">stem</span>,{' '}
            <span className="word__morph word__morph_ending">ending</span> — in the four
            colours interlinear.cc uses too, so recognition built on one site carries to
            the other. Known words lose gloss and seam together, in one 300ms transition.
          </p>
        </Section>

        <Section title="Controls" aside="Chips · fields · actions">
          <div className="ds__grid">
            <div className="ds__stack">
              <span className="ds__label">Segmented</span>
              <div className="reader__seg" role="group" aria-label="Gloss mode sample">
                <button type="button" aria-pressed={true}>
                  Glosses
                </button>
                <button type="button" aria-pressed={false}>
                  Literal
                </button>
                <button type="button" aria-pressed={false}>
                  Off
                </button>
              </div>
              <span className="ds__label ds__label_spaced">Toggle chips</span>
              <div className="reader__toggles">
                <label className="reader__toggle">
                  <input type="checkbox" defaultChecked readOnly /> Morphemes
                </label>
                <label className="reader__toggle">
                  <input type="checkbox" readOnly /> Translation
                </label>
              </div>
              <span className="ds__note">
                Real checkboxes, visually hidden: a chip that focuses, announces and
                answers to the space bar.
              </span>
            </div>

            <div className="ds__stack">
              <span className="ds__label">Search field</span>
              <div className="index__search">
                <input
                  type="search"
                  placeholder="Search by collection, number, or title…"
                  aria-label="Search sample"
                />
              </div>
              <span className="ds__label ds__label_spaced">Actions</span>
              <div className="ds__row">
                <button type="button" className="btn btn_transparent-blue">
                  I know this word
                </button>
                <button
                  type="button"
                  className="btn btn_transparent-blue definition__known-btn_active"
                >
                  Marked as known
                </button>
              </div>
              <div className="ds__row ds__row_baseline">
                <a href="https://suttacentral.net" target="_blank" rel="noreferrer">
                  Parallels &amp; more translations ↗
                </a>
                <span className="epigraph__cta">Read it →</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Surfaces &amp; lists" aside="Paper · rows · badges">
          <div className="ds__grid">
            <div className="ds__stack">
              <span className="ds__label">Paper card</span>
              <div className="paper paper_tabbed ds__paper">
                <span className="ds__paper-title">Raised leaf</span>
                <span className="ds__note">
                  3px radius, 1px #e4dccc edge, a long soft shadow and an optional 64×3px
                  saffron tab at the top-left. Used for the verse specimen and the
                  dictionary.
                </span>
              </div>
              <span className="ds__label ds__label_spaced">Badges</span>
              <div className="ds__row">
                <span className="badge badge_glossed">Glossed</span>
                <span className="badge badge_quiet">Pali only</span>
                <span className="badge badge_read">Read</span>
                <span className="definition__morph-chip definition__morph-chip_stem">
                  gacch
                </span>
                <span className="definition__morph-chip definition__morph-chip_ending">
                  ā
                </span>
              </div>
            </div>

            <div className="ds__stack">
              <span className="ds__label">Sutta row</span>
              <div className="ds__rows">
                <span className="index__row">
                  <span className="index__num">01</span>
                  <span className="index__titles">
                    <span className="index__orig">Saraṇattaya</span>
                    <span className="index__en">The Three Refuges</span>
                  </span>
                  <span className="index__meta">
                    <span className="badge badge_glossed">Glossed</span>
                  </span>
                </span>
                <span className="index__row ds__row_hover">
                  <span className="index__num">02</span>
                  <span className="index__titles">
                    <span className="index__orig">Dasasikkhāpada</span>
                    <span className="index__en">The Ten Precepts · hover state</span>
                  </span>
                  <span className="index__meta">
                    <span className="badge badge_glossed">Glossed</span>
                  </span>
                </span>
              </div>

              <span className="ds__label ds__label_spaced">Passage index</span>
              <div className="reader__passage-list">
                <span className="reader__passage reader__passage_current">
                  <span className="reader__passage-n">2</span>
                  <span className="reader__passage-label">Buddhaṃ saraṇaṃ gacchāmi</span>
                </span>
                <span className="reader__passage">
                  <span className="reader__passage-n">3</span>
                  <span className="reader__passage-label">Dutiyampi buddhaṃ saraṇaṃ</span>
                </span>
              </div>
              <span className="ds__note">
                A passage is a run of source segments about ninety words long, so a
                sutta stored as two hundred fragments still has an index you can
                scan. It has no name, so it is labelled with its opening words —
                past eight passages, or where a refrain makes two labels read the
                same, the strip drops them and keeps the numbers.
              </span>
            </div>
          </div>
        </Section>

        <Section title="Dictionary entry" aside="Six blocks, fixed order">
          <div className="ds__grid">
            <div className="ds__card">
              <h3 className="definition__heading">Dictionary</h3>
              <div className="definition__panel">
                <div className="definition__term">
                  <span className="definition__term-text">gacchāmi</span>
                  <span className="definition__term-note">I go</span>
                </div>
                <div className="definition__entry">
                  <h3 className="definition__title">gacchati</h3>
                  <p className="definition__grammar">pr 1st sg of gacchati (verb)</p>
                  <ol className="definition__meanings">
                    <li>goes; walks; moves; travels</li>
                    <li>becomes; lit. goes</li>
                  </ol>
                  <div className="definition__morphs">
                    <h4 className="definition__morphs-heading">Built from</h4>
                    <div className="definition__morph">
                      <span className="definition__morph-chip definition__morph-chip_stem">
                        gacch
                      </span>
                      <span className="definition__morph-body">
                        <span className="definition__morph-kind">stem · go</span>
                        From √gam with a nasal infix.
                      </span>
                    </div>
                  </div>
                  <p>
                    <b>
                      Etymology
                      <span className="definition__stop">.</span>
                    </b>{' '}
                    Root √gam (Sanskrit gam-, Indo-European *gʷem- “to go”). Cognates:
                    English come, Latin venio.
                  </p>
                </div>
                <div className="definition__known">
                  <button type="button" className="btn btn_transparent-blue">
                    I know this word
                  </button>
                  <p className="definition__known-hint">
                    Fades its gloss out in every text, so the page slowly becomes bare
                    Pali.
                  </p>
                </div>
              </div>
            </div>

            <div className="ds__steps">
              {ENTRY_BLOCKS.map((block, i) => (
                <div className="ds__step" key={block.title}>
                  <span className="ds__ordinal">{i + 1}</span>
                  <span>
                    <span className="ds__step-title">{block.title}</span>
                    <span className="ds__note">{block.body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Layout" aside="Measure &amp; rhythm">
          <div className="ds__grid ds__grid_wide">
            {LAYOUT.map((item) => (
              <div className="ds__stack ds__stack_tight" key={item.value}>
                <span className="ds__measure">{item.value}</span>
                <span className="ds__note">{item.note}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="ds__foot">
          <span className="ds__foot-line">
            Everything here is in use on the index and reader screens.
          </span>
          <span className="ds__aside">sutta.stream · design system v1</span>
        </div>
      </div>
    </div>
  )
}
