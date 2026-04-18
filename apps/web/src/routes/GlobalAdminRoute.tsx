export function GlobalAdminRoute() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
        Admin global
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Control operativo, revisiones y salud de fuentes.
      </h1>
      <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm leading-7 text-[var(--muted)]">
        Esta area agrupara centros, incidencias, eventos, admins de centro,
        anomalias de parser, refrescos de ingesta, auditoria y moderacion minima
        de ratings.
      </div>
    </main>
  );
}
