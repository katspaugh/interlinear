import { Link } from 'react-router-dom'
import type { TextSummary } from '@interlinear/shared'
import { isRead, useReadMarks } from '../readMarks.js'
import { Words } from './Words.js'

export function TextCard(props: { text: TextSummary }) {
  const { text } = props
  useReadMarks()
  return (
    <Link to={`/text/${text.slug}`} className="card">
      {isRead(text.slug) && <span className="card__ribbon">read</span>}
      <div className="card__heading">
        <span className="card__lang">{text.lang}</span>
        <h3 className="card__title">{text.origTitle ?? text.title}</h3>
        <cite className="card__source">{text.source ?? text.title}</cite>
      </div>

      <div className="card__body">
        {text.preview ? (
          <Words words={text.preview} showGlosses={true} />
        ) : (
          <p className="card__pending">
            {text.status === 'failed'
              ? '⚠ glossing failed'
              : text.status === 'unglossed'
                ? 'Not yet glossed — open to read'
                : 'Glossing…'}
          </p>
        )}
      </div>

      {text.status === 'glossing' && (
        <span className="card__progress">
          glossing {text.glossedCount}/{text.chunkCount}
        </span>
      )}
      <span className="card__button">Read</span>
    </Link>
  )
}
