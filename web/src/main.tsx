import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { createClient } from '@intenteffect/client'
import { IntentEffectProvider } from '@intenteffect/react'
import { adminHeaders } from './admin.js'
import { App } from './App.js'
import { Home } from './pages/Home.js'
import { Reader } from './pages/Reader.js'
import { applySite } from './site.js'
import './styles.css'
import './theme-sutta.css'

/** The style guide is for whoever is building the site, not for readers —
 * lazily loaded so it costs the reader nothing. */
const DesignSystem = lazy(() =>
  import('./pages/DesignSystem.js').then((module) => ({ default: module.DesignSystem })),
)

applySite()

const client = createClient({ headers: adminHeaders })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntentEffectProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Home />} />
            <Route path="text/:slug" element={<Reader />} />
          </Route>
          {/* Outside the app chrome: the guide carries its own header and
              always renders in sutta.stream's skin. */}
          <Route
            path="design"
            element={
              <Suspense fallback={null}>
                <DesignSystem />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </IntentEffectProvider>
  </StrictMode>,
)
