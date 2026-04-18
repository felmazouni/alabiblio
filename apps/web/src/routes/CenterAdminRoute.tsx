export function CenterAdminRoute() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        Admin de centros
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Activacion corporativa, horarios y trazabilidad.
      </h1>
      <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm leading-7 text-[var(--muted)]">
        El flujo previsto incluye activacion por email corporativo, set y reset de
        contrasena, gestion de horarios normalizados, incidencias, eventos y
        previsualizacion publica. La implementacion real comenzara despues del
        esquema D1 y del adapter de email.
      </div>
    </main>
  );
}

