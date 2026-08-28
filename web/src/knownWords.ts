import { useSyncExternalStore } from 'react'

/**
 * Local-only reader memory, kept per language in this browser's localStorage
 * (never sent to the server, like readMarks):
 *
 * - words explicitly marked known ("I know this word" in the dictionary
 *   panel) — their glosses dissolve everywhere;
 * - how many finished texts each word has been seen in — glosses of familiar
 *   words start faded instead of at full strength, so the page turns into
 *   bare Pali as the reader's exposure grows.
 */

const KNOWN_KEY = 'interlinear.knownWords'
const SEEN_KEY = 'interlinear.seenWords'

/** Fade levels are capped at 3 for mere exposure (4 = invisible is reserved
 * for explicitly known words), so higher counts carry no extra information. */
const MAX_SEEN = 9

interface SeenState {
  /** Slugs of texts already counted, so re-reading doesn't inflate counts. */
  texts: string[]
  /** word -> number of counted texts it appeared in, capped at MAX_SEEN. */
  counts: Record<string, number>
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode etc. — the in-memory state still works for this page */
  }
}

function langKey(lang: string): string {
  return lang.trim().toLowerCase()
}

let known = new Map<string, Set<string>>(
  Object.entries(loadJson<Record<string, string[]>>(KNOWN_KEY, {})).map(
    ([lang, words]) => [lang, new Set(words)],
  ),
)
let seen = loadJson<Record<string, SeenState>>(SEEN_KEY, {})

let version = 0
const subscribers = new Set<() => void>()

function notify(): void {
  version++
  for (const fn of subscribers) fn()
}

function saveKnown(): void {
  saveJson(
    KNOWN_KEY,
    Object.fromEntries([...known].map(([lang, words]) => [lang, [...words]])),
  )
}

export function isKnown(lang: string, word: string): boolean {
  return known.get(langKey(lang))?.has(word) ?? false
}

export function toggleKnown(lang: string, word: string): void {
  const key = langKey(lang)
  const words = known.get(key) ?? new Set<string>()
  if (words.has(word)) words.delete(word)
  else words.add(word)
  known.set(key, words)
  saveKnown()
  notify()
}

/** In how many finished texts this word has been seen (0 for never). */
export function seenCount(lang: string, word: string): number {
  return seen[langKey(lang)]?.counts[word] ?? 0
}

/**
 * Count one fully glossed text into the exposure counts — once per text,
 * however many times it is reopened. `words` are the text's normalized
 * words; duplicates within the text count as one exposure.
 */
export function recordTextSeen(lang: string, slug: string, words: string[]): void {
  const key = langKey(lang)
  const state = seen[key] ?? { texts: [], counts: {} }
  if (state.texts.includes(slug)) return
  state.texts.push(slug)
  for (const word of new Set(words)) {
    if (!word) continue
    state.counts[word] = Math.min((state.counts[word] ?? 0) + 1, MAX_SEEN)
  }
  seen[key] = state
  saveJson(SEEN_KEY, seen)
  notify()
}

/** Subscribe the component to knowledge changes; returns a change counter. */
export function useWordKnowledge(): number {
  return useSyncExternalStore(
    (onChange) => {
      subscribers.add(onChange)
      return () => subscribers.delete(onChange)
    },
    () => version,
    () => version,
  )
}
