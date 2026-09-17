import { Fragment, useMemo } from 'react'
import { literalGloss, normalizeWord, type Word } from '@interlinear/shared'
import { isKnown, useWordKnowledge } from '../knownWords.js'

export type GlossMode = 'fluent' | 'literal' | 'off'

/** Beyond this many repetitions the gloss stops fading further — it stays
 * readable, since only an explicit "I know this word" dissolves it fully. */
const MAX_FADE = 6

/**
 * The occurrence index of each word (0 the first time it appears, 1 the
 * second time, …), which drives how far its gloss is faded. Pass a shared
 * `running` map to count one text's chunks as a single run, so the second
 * occurrence of a word fades even when it falls in a later stanza.
 */
export function wordOccurrences(
  words: Word[],
  running = new Map<string, number>(),
): number[] {
  return words.map((word) => {
    const key = normalizeWord(word.w)
    if (!key) return 0
    const occur = running.get(key) ?? 0
    running.set(key, occur + 1)
    return occur
  })
}

/**
 * The interlinear view: each word with its gloss above it. The first time a
 * word appears its gloss is at full strength; every repetition after that is
 * dimmer than the one before (like the original interlinear.io), until it
 * bottoms out at MAX_FADE. Words the reader marked known are dissolved
 * entirely — hover to peek — which needs `lang` (absent on library cards and
 * the epigraph, where only the repetition fading applies). Pass `occurrences`
 * (from `wordOccurrences`) to carry the count of earlier chunks into this
 * one; without it the fading restarts.
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
  occurrences?: number[]
  onWordClick?: (word: Word) => void
  /** Fired on pointerdown, before the click completes — lets the reader
   * start fetching the definition a beat earlier. */
  onWordDown?: (word: Word) => void
  selectedWord?: string | null
}) {
  const { lang, glossMode = 'fluent', words } = props
  useWordKnowledge()
  const occurrences = useMemo(
    () => props.occurrences ?? wordOccurrences(words),
    [props.occurrences, words],
  )
  return (
    <div
      className={[
        'words',
        glossMode === 'off' ? 'words_hide-glosses' : '',
        props.showMorphs ? 'words_morphs' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {words.map((word, i) => {
        const key = normalizeWord(word.w)
        const fade = Math.min(occurrences[i] ?? 0, MAX_FADE)
        const known = Boolean(lang && key && isKnown(lang, key))
        const clickable = Boolean(props.onWordClick && key)
        const selected = props.selectedWord != null && key === props.selectedWord
        const gloss = glossMode === 'literal' ? (literalGloss(word.m) ?? word.g) : word.g
        const segments = props.showMorphs && word.m && word.m.length > 1 ? word.m : null
        return (
          <Fragment key={i}>
            <span
              className={[
                'word',
                fade > 0 ? `word_occur_${fade}` : '',
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
