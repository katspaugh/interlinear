import { Link, Outlet, useLocation } from 'react-router-dom'
import { useConnectionStatus } from '@intenteffect/react'

export function Logo() {
  return (
    <>
      <sup>i</sup>nterl<sub>i</sub>near<sup>io</sup>
    </>
  )
}

export function App() {
  const isHome = useLocation().pathname === '/'
  const status = useConnectionStatus()

  return (
    <div className={`page ${isHome ? 'page_home' : ''}`}>
      <header className="header">
        <div className="container header__inner">
          <h1 className="header__logo">
            <Link to="/">
              <Logo />
            </Link>
          </h1>
          {status !== 'live' && <span className="header__status">{status}…</span>}
        </div>
      </header>

      <main className="page__content">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p>
            Made in 2015, reborn in 2026 for the Pali suttas. Interlinear glossing
            and dictionary by{' '}
            <a href="https://www.anthropic.com/claude" target="_blank" rel="nofollow noreferrer">
              Claude
            </a>
            . Synchronized with{' '}
            <a
              href="https://github.com/katspaugh/intenteffect"
              target="_blank"
              rel="nofollow noreferrer"
            >
              IntentEffect
            </a>
            .
          </p>
          <a
            className="footer__camera"
            href="https://unsplash.com/photos/mRiyE_FIbBY"
            target="_blank"
            rel="nofollow noreferrer"
            title="Background photo"
          >
            📷
          </a>
        </div>
      </footer>
    </div>
  )
}
