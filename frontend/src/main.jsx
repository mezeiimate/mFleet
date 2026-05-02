import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* A BrowserRouter teszi lehetővé, hogy az URL változzon és működjön a vissza gomb */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)