import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Mouse wheel over number/range inputs must not change values while scrolling the page
document.addEventListener(
  'wheel',
  event => {
    const el = event.target
    if (!(el instanceof HTMLInputElement)) return
    if (el.type !== 'number' && el.type !== 'range') return
    if (document.activeElement === el) el.blur()
  },
  { passive: true },
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
