import { createRoot } from 'react-dom/client'; import App from './App'; import './styles/theme.css'
import { prefetchSheet } from './services/scoreService'
prefetchSheet() // start reading the spreadsheet immediately
import('./scenes/World') // ...and downloading the 3D scene, both in parallel with React starting up
createRoot(document.getElementById('root')!).render(<App />)
