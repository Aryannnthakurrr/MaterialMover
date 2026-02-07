import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import './styles/style.css'
import './styles/earth-scroll.css'

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
)
