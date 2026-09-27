import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx'
import { LazyPilotRoot } from './pilot/LazyPilotRoot'

const PetHunt = lazy(() => import('./features/pet-hunt/PetHunt').then(m => ({ default: m.PetHunt })));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<p role="status">Opening your game…</p>}>
        {new URLSearchParams(window.location.search).has('petHunt') ? <PetHunt /> : import.meta.env.MODE === 'pilot' ? <LazyPilotRoot /> : <App />}
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
