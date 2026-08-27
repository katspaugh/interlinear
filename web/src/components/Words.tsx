import { Fragment } from 'react'
import { normalizeWord, type Word } from '@interlinear/shared'

/**
 * The interlinear view: each word with its gloss above it. Glosses of
 * repeated words fade progressively (you've seen them before), like the
 * original interlinear.io.
 */
export function Words(props: {
  words: Word[]
  showGlosses: boolean
  onWordClick?: (word: Word) => void
  selectedWord?: string | null
}) {
  const seen = new Map<string, number>()
  return (
    <div className={`words ${props.showGlosses ? '' : 'words_hide-glosses'}`}>
      {props.words.map((word, i) => {
        const key = normalizeWord(word.w)
        const occur = seen.get(key) ?? 0
        if (key) seen.set(key, occur + 1)
        const clickable = Boolean(props.onWordClick && key)
        const selected = props.selectedWord != null && key === props.selectedWord
        return (
          <Fragment key={i}>
            <span
              className={[
                'word',
                `word_occur_${Math.min(occur, 4)}`,
                clickable ? 'word_clickable' : '',
                selected ? 'word_selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={clickable ? () => props.onWordClick!(word) : undefined}
            >
              <span className="word__gloss">{word.g || ' '}</span>
              <span className="word__text">{word.w}</span>
            </span>{' '}
            {word.nl && <br />}
          </Fragment>
        )
      })}
    </div>
  )
}
