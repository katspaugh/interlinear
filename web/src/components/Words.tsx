import { Fragment } from 'react'
import { literalGloss, normalizeWord, type Word } from '@interlinear/shared'
import { isKnown, seenCount, useWordKnowledge } from '../knownWords.js'

export type GlossMode = 'fluent' | 'literal' | 'off'

/**
 * The interlinear view: each word with its gloss above it. Glosses fade as
 * words become familiar — repeated words within the page (like the original
 * interlinear.io), words seen in previously finished texts, and words the
 * reader marked known (fully faded; hover to peek). When `lang` is absent
 * (library cards, the epigraph) only the in-page fading applies.
 *
 * In 'literal' mode the gloss line shows the morpheme-by-morpheme reading
 * ("mind·before·going") where a word has one; `showMorphs` renders the
 * morpheme segmentation as colored seams inside the word itself.
 */
export function Words(props: {
  words: Word[]
  lang?: string
  glossMode?: GlossMode
  showMorphs?: boolean
  onWordClick?: (word: Word) => void
  /** Fired on pointerdown, before the click completes — lets the reader
   * start fetching the definition a beat earlier. */
  onWordDown?: (word: Word) => void
  selectedWord?: string | null
}) {
  const { lang, glossMode = 'fluent' } = props
  useWordKnowledge()
  const seen = new Map<string, number>()
  return (
    <div className={`words ${glossMode === 'off' ? 'words_hide-glosses' : ''}`}>
      {props.words.map((word, i) => {
        const key = normalizeWord(word.w)
        const occur = seen.get(key) ?? 0
        if (key) seen.set(key, occur + 1)
        const known = Boolean(lang && key && isKnown(lang, key))
        const prior = lang && key ? Math.min(seenCount(lang, key), 3) : 0
        const fade = known ? 4 : Math.min(prior + occur, 4)
        const clickable = Boolean(props.onWordClick && key)
        const selected = props.selectedWord != null && key === props.selectedWord
        const gloss = glossMode === 'literal' ? (literalGloss(word.m) ?? word.g) : word.g
        const segments = props.showMorphs && word.m && word.m.length > 1 ? word.m : null
        return (
          <Fragment key={i}>
            <span
              className={[
                'word',
                `word_occur_${fade}`,
                known ? 'word_known' : '',
                clickable ? 'word_clickable' : '',
                selected ? 'word_selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onPointerDown={clickable && props.onWordDown ? () => props.onWordDown!(word) : undefined}
              onClick={clickable ? () => props.onWordClick!(word) : undefined}
            >
              <span className="word__gloss">{gloss || ' '}</span>
              <span className="word__text">
                {segments
                  ? segments.map((m, j) => (
                      <Fragment key={j}>
                        {m.sandhi && (
                          <span className="word__sandhi" title="Two words fused by sandhi">
                            ‿
                          </span>
                        )}
                        <span className={`word__morph word__morph_${m.k}`}>{m.s}</span>
                      </Fragment>
                    ))
                  : word.w}
              </span>
            </span>{' '}
            {word.nl && <br />}
          </Fragment>
        )
      })}
    </div>
  )
}
