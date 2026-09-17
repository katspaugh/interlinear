import { useSyncExternalStore } from 'react'

/**
 * Local-only reader memory, kept per language in this browser's localStorage
 * (never sent to the server, like readMarks): the words explicitly marked
 * known ("I know this word" in the dictionary panel), whose glosses dissolve
 * everywhere. Fading by repetition is a property of the page, not of this
 * memory — see `Words`.
 */

const KNOWN_KEY = 'interlinear.knownWords'

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
