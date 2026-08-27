import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { createClient } from '@intenteffect/client'
import { IntentEffectProvider } from '@intenteffect/react'
import { App } from './App.js'
import { Home } from './pages/Home.js'
import { Reader } from './pages/Reader.js'
import './styles.css'

const client = createClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IntentEffectProvider client={client}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Home />} />
            <Route path="text/:slug" element={<Reader />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </IntentEffectProvider>
  </StrictMode>,
)
