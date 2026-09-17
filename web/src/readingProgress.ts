import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Where the reader is in the text, measured from the scroll position — the
 * only reading-position signal the app actually has. `ratio` drives the
 * saffron hairline under the header; `active` is the passage whose top has
 * most recently crossed the reading line, and marks the current chip in the
 * passage index.
 *
 * Passages are found in the DOM (`[data-passage]` inside `containerRef`)
 * rather than registered through refs: the set changes as a text is glossed
 * live, and a ref callback rebuilt on every render would detach and
 * reattach every passage each time.
 */
export function useReadingProgress(enabled: boolean, passageCount: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(0)
  const [active, setActive] = useState(0)

  const scrollTo = useCallback((idx: number) => {
    containerRef.current
      ?.querySelector(`[data-passage="${idx}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    if (!enabled) return
    let frame = 0

    function measure() {
      frame = 0
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setRatio(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0)

      // A third of the way down the viewport: far enough in that the passage
      // being read has cleared the header, not so far that the last passage
      // of a short text can never become current.
      const line = window.innerHeight / 3
      let current = 0
      for (const node of containerRef.current?.querySelectorAll('[data-passage]') ?? []) {
        const idx = Number((node as HTMLElement).dataset.passage)
        if (node.getBoundingClientRect().top <= line && idx > current) current = idx
      }
      setActive(current)
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // Stanzas of a text still being glossed appear under the reader without
    // any scroll or resize: the page grows, so the ratio has to be retaken.
    const observer = new ResizeObserver(onScroll)
    observer.observe(document.body)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enabled, passageCount])

  return { ratio, active, containerRef, scrollTo }
}
