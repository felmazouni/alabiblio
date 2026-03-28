import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  ok: boolean
  env: string
  timestamp: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetch('/api/health')
      .then((response) => response.json() as Promise<HealthResponse>)
      .then((data) => {
        if (!cancelled) {
          setHealth(data)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">Premio reutilizacion de datos · Madrid</span>
          <h1>Encuentra el mejor sitio para estudiar en Madrid sin perder tiempo.</h1>
          <p className="lede">
            Bibliotecas y salas de estudio con informacion operativa clara: abierto
            ahora, aforo, contacto, transporte recomendado y contexto de movilidad.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="/api/health">
              Ver estado de la API
            </a>
            <span className="status-card">
              <strong>Estado actual</strong>
              <span>
                {health?.ok
                  ? `API online · ${health.env}`
                  : 'Conectando con el backend'}
              </span>
            </span>
          </div>
        </div>

        <aside className="hero__panel" aria-label="Resumen operativo">
          <div className="metric">
            <span className="metric__label">Lo que va a mostrar la app</span>
            <strong className="metric__value">Abierto ahora</strong>
            <p>Horario util, aforo, telefono, como llegar y recomendaciones utiles.</p>
          </div>
          <div className="metric-grid">
            <article>
              <span>Movilidad</span>
              <strong>EMT + Bicimad + SER</strong>
            </article>
            <article>
              <span>Centros</span>
              <strong>Bibliotecas y salas</strong>
            </article>
            <article>
              <span>Valoraciones</span>
              <strong>8 metricas estructuradas</strong>
            </article>
            <article>
              <span>Backend</span>
              <strong>{health?.env ?? 'bootstrapping'}</strong>
            </article>
          </div>
        </aside>
      </section>

      <section className="highlights" aria-label="Capacidades clave">
        <article className="highlight-card">
          <span className="highlight-card__index">01</span>
          <h2>Decision inmediata</h2>
          <p>
            La home final priorizara estado operativo, distancia, llegada estimada y
            servicios antes que cualquier dato secundario.
          </p>
        </article>

        <article className="highlight-card">
          <span className="highlight-card__index">02</span>
          <h2>Datos oficiales unificados</h2>
          <p>
            Madrid Datos Abiertos, EMT, Bicimad, SER y agenda de bibliotecas quedaran
            normalizados en un mismo dominio de consulta.
          </p>
        </article>

        <article className="highlight-card">
          <span className="highlight-card__index">03</span>
          <h2>Base preparada para escalar</h2>
          <p>
            Cloudflare Workers, assets servidos desde el mismo dominio y API bajo
            <code> /api</code> ya operativos.
          </p>
        </article>
      </section>
    </main>
  )
}

export default App
