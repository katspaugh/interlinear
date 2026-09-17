import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { groupLibrary, sourceNumber, type TextSummary } from '@interlinear/shared'
import { isRead, useReadMarks } from '../readMarks.js'
import { Spinner } from './Spinner.js'

/** How many rows render per collection before the scroll sentinel grows the
 * window — the Dhammapada alone runs to hundreds. */
const ROW_BATCH = 50

/** Sentinel for "every collection at once", so nothing in the library is
 * more than one click away even though the index shows one at a time. */
function StatusChip(props: { text: TextSummary }) {
  const { text } = props
  if (text.status === 'glossing') {
    return (
      <span className="badge badge_quiet">
        glossing {text.glossedCount}/{text.chunkCount}
      </span>
    )
  }
  if (text.status === 'ready') {
    return <span className="badge badge_glossed">Glossed</span>
  }
  if (text.status === 'failed') {
    return <span className="badge badge_failed">⚠</span>
  }
  return <span className="badge badge_quiet">Pali only</span>
}

/** The canonical number of a text within its collection ("Khuddakapāṭha 1"
 * → 01), falling back to its position when the source line carries none. */
function rowNumber(text: TextSummary, position: number): string {
  const n = sourceNumber(text.source)
  const value = Number.isFinite(n) ? n : position
  return Number.isInteger(value) && value < 10 ? `0${value}` : String(value)
}

function IndexRow(props: { text: TextSummary; position: number }) {
  const { text } = props
  return (
    <Link to={`/text/${text.slug}`} className="index__row">
      <span className="index__num">{rowNumber(text, props.position)}</span>
      <span className="index__titles">
        <span className="index__orig">{text.origTitle ?? text.title}</span>
        {text.origTitle && <span className="index__en">{text.title}</span>}
      </span>
      <span className="index__meta">
        {isRead(text.slug) && <span className="badge badge_read">Read</span>}
        <StatusChip text={text} />
      </span>
    </Link>
  )
}

/**
 * The collection index — the home listing for sites carrying hundreds of
 * texts (sutta.stream). A sticky rail holds the search field and the
 * collections; the page beside it shows one collection at a time as a
 * hairline list of rows. Searching reaches across all of them at once.
 *
 * Receives the texts already filtered by the site's lens and by the query.
 */
export function Library(props: {
  texts: TextSummary[]
  query: string
  onQuery: (query: string) => void
  placeholder: string
}) {
  useReadMarks()
  // null selection means "the first collection", so the index has something
  // on show before the reader has picked anything.
  const [selected, setSelected] = useState<string | null>(null)
  // "All" flattens every collection — nothing in the library is more than one
  // click away, even though the index shows one collection at a time.
  const [showAll, setShowAll] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ROW_BATCH)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const searching = props.query.trim() !== ''

  const groups = useMemo(() => groupLibrary(props.texts), [props.texts])

  // A search spans every collection, so the rail steps aside until it is
  // cleared. Otherwise the first collection is the one on show, unless the
  // reader picked another — or picked "All", which flattens them in the same
  // canonical order the rail lists them in.
  const showingAll = !searching && showAll
  const current =
    searching || showingAll
      ? null
      : (groups.find((group) => group.name === selected) ?? groups[0] ?? null)
  const rows = useMemo(() => {
    if (searching) return props.texts
    if (showingAll) return groups.flatMap((group) => group.texts)
    return current?.texts ?? []
  }, [searching, showingAll, groups, current, props.texts])

  const visible = rows.slice(0, visibleCount)
  const hasMore = visibleCount < rows.length

  useEffect(() => {
    setVisibleCount(ROW_BATCH)
  }, [selected, showAll, props.query])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + ROW_BATCH)
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, visibleCount])

  const glossed = rows.filter((text) => text.status === 'ready').length
  const heading = searching
    ? `Results for “${props.query.trim()}”`
    : showingAll
      ? 'All collections'
      : (current?.name ?? 'Library')

  return (
    <div className="index">
      <aside className="index__side">
        <div className="index__search">
          <input
            type="search"
            placeholder={props.placeholder}
            aria-label="Search the library"
            value={props.query}
            onChange={(event) => props.onQuery(event.target.value)}
          />
        </div>

        <nav className="index__collections" aria-label="Collections">
          <div className="index__collections-label">Collections</div>
          <button
            type="button"
            className={`index__collection ${showingAll ? 'index__collection_current' : ''}`}
            aria-current={showingAll}
            onClick={() => setShowAll(true)}
          >
            All
            <span className="index__collection-count">{props.texts.length}</span>
          </button>
          {groups.map((group) => (
            <button
              type="button"
              key={group.name}
              className={`index__collection ${
                current?.name === group.name ? 'index__collection_current' : ''
              }`}
              aria-current={current?.name === group.name}
              onClick={() => {
                setShowAll(false)
                setSelected(group.name)
              }}
            >
              {group.name}
              <span className="index__collection-count">{group.texts.length}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="index__main">
        <div className="index__head">
          <h2>{heading}</h2>
          <span className="index__count">
            {rows.length} {rows.length === 1 ? 'text' : 'texts'}
            {rows.length > 0 &&
              (glossed === rows.length ? ' · all glossed' : ` · ${glossed} glossed`)}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="index__empty">
            {searching ? `Nothing matches “${props.query.trim()}”.` : 'Nothing here yet.'}
          </p>
        ) : (
          visible.map((text, i) => <IndexRow key={text.id} text={text} position={i + 1} />)
        )}

        {hasMore && (
          <div className="home__more" ref={sentinelRef}>
            <Spinner />
          </div>
        )}
      </div>
    </div>
  )
}
