import { useSyncExternalStore } from 'react'

/**
 * Local-only "read" markers: which texts this reader has finished, kept in
 * this browser's localStorage — never sent to the server.
 */

const KEY = 'interlinear.read'

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

let marks = load()
let version = 0
const subscribers = new Set<() => void>()

export function isRead(slug: string): boolean {
  return marks.has(slug)
}

export function toggleRead(slug: string): void {
  if (marks.has(slug)) marks.delete(slug)
  else marks.add(slug)
  try {
    localStorage.setItem(KEY, JSON.stringify([...marks]))
  } catch {
    /* private mode etc. — the in-memory marks still work for this page */
  }
  version++
  for (const notify of subscribers) notify()
}

/** Subscribe the component to read-mark changes; returns a change counter. */
export function useReadMarks(): number {
  return useSyncExternalStore(
    (onChange) => {
      subscribers.add(onChange)
      return () => subscribers.delete(onChange)
    },
    () => version,
    () => version,
  )
}
