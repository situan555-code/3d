import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './portfolio/styles.css'

// Single root: The 3D office scene (R3F Canvas)
// PortfolioApp now renders inside OfficeScene's <Html> component.
// NOTE: No StrictMode — it double-mounts effects, which zombifies the
// WICG layoutsubtree bridge (1-to-1 relationship with the canvas).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
)
