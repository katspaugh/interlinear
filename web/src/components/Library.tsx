import { Link } from 'react-router-dom'
import { groupLibrary, type TextSummary } from '@interlinear/shared'
import { isRead, useReadMarks } from '../readMarks.js'

function StatusChip(props: { text: TextSummary }) {
  const { text } = props
  if (text.status === 'glossing') {
    return (
      <span className="library__status">
        glossing {text.glossedCount}/{text.chunkCount}
      </span>
    )
  }
  if (text.status === 'ready') {
    return <span className="library__status library__status_ready">glossed</span>
  }
  if (text.status === 'failed') {
    return <span className="library__status library__status_failed">⚠</span>
  }
  return null
}

function LibraryRow(props: { text: TextSummary }) {
  const { text } = props
  return (
    <Link to={`/text/${text.slug}`} className="library__row">
      <span className="library__titles">
        <span className="library__orig">{text.origTitle ?? text.title}</span>
        {text.origTitle && <span className="library__en">{text.title}</span>}
      </span>
      <span className="library__meta">
        {isRead(text.slug) && <span className="library__read">read</span>}
        <StatusChip text={text} />
        {text.source && <cite className="library__ref">{text.source}</cite>}
      </span>
    </Link>
  )
}

/**
 * The collection-grouped library index — the home view for sites carrying
 * hundreds of texts (sutta.stream), where the flat card grid stops working.
 * Receives the texts already filtered by the home page's search box.
 */
export function Library(props: { texts: TextSummary[] }) {
  useReadMarks()
  return (
    <div className="library">
      {groupLibrary(props.texts).map((group) => (
        <section className="library__group" key={group.name}>
          <h2 className="library__collection">{group.name}</h2>
          <div className="library__rows">
            {group.texts.map((text) => (
              <LibraryRow key={text.id} text={text} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
