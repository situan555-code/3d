import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import PortfolioApp from './portfolio/App.jsx'
import './index.css'
import './portfolio/styles.css'

// Root 1: The 3D office scene (R3F Canvas)
// NOTE: No StrictMode — it double-mounts effects, which zombifies the
// WICG layoutsubtree bridge (1-to-1 relationship with the canvas).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
)

// Root 2: The Win95 portfolio UI (inside WICG proxy canvas for texture capture)
const osRoot = document.getElementById('os-ui')
if (osRoot) {
  ReactDOM.createRoot(osRoot).render(
    <PortfolioApp />,
  )
}
