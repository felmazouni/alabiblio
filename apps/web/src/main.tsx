import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const isApiPath = window.location.pathname.startsWith('/api/')

if (isApiPath) {
  const root = document.getElementById('root')

  if (root) {
    void fetch(window.location.pathname + window.location.search, {
      cache: 'reload',
      headers: {
        accept: 'application/json',
      },
    })
      .then(async (response) => {
        const body = await response.text()

        document.title = 'alabiblio api'
        document.body.innerHTML = ''
        document.body.style.margin = '0'
        document.body.style.padding = '24px'
        document.body.style.background =
          'linear-gradient(180deg, #06111d 0%, #0b1626 100%)'
        document.body.style.color = '#f6f8fc'
        document.body.style.font = '16px/1.5 Consolas, Monaco, monospace'

        const pre = document.createElement('pre')
        pre.style.whiteSpace = 'pre-wrap'
        pre.style.wordBreak = 'break-word'
        pre.textContent = body
        document.body.appendChild(pre)
      })
      .catch(() => {
        document.title = 'alabiblio api'
        document.body.innerHTML = ''

        const pre = document.createElement('pre')
        pre.textContent = '{"error":"api fetch failed"}'
        document.body.appendChild(pre)
      })
  }
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
