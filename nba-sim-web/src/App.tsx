import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { Home } from './components/Home/Home'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { useLocalization } from './hooks/useLocalization'
import { Loader2 } from 'lucide-react'

// Lazy load route components for code splitting
const TeamSelection = lazy(() => import('./components/TeamSelection/TeamSelection').then(m => ({ default: m.TeamSelection })))
const GameView = lazy(() => import('./components/GameView/GameView').then(m => ({ default: m.GameView })))
const SeasonView = lazy(() => import('./components/Season/SeasonView').then(m => ({ default: m.SeasonView })))
const PredictionView = lazy(() => import('./components/Prediction/PredictionView').then(m => ({ default: m.PredictionView })))
const Settings = lazy(() => import('./components/Settings/Settings').then(m => ({ default: m.Settings })))

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
  </div>
)

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="single-game" element={
            <Suspense fallback={<PageLoader />}>
              <TeamSelection />
            </Suspense>
          } />
          <Route path="game" element={
            <Suspense fallback={<PageLoader />}>
              <GameView />
            </Suspense>
          } />
          <Route path="season" element={
            <Suspense fallback={<PageLoader />}>
              <SeasonView />
            </Suspense>
          } />
          <Route path="prediction" element={
            <Suspense fallback={<PageLoader />}>
              <PredictionView />
            </Suspense>
          } />
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  const { init, isInitialized } = useLocalization()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init().then(() => setLoading(false))
  }, [init])

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
