import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { BottomNavBar } from "../features/navigation/BottomNavBar";
import { DesktopTopBar } from "../features/navigation/DesktopTopBar";

const TopPicksScreen = lazy(async () => {
  const module = await import("../features/centers/screens/TopPicksScreen");
  return { default: module.TopPicksScreen };
});

const CatalogScreen = lazy(async () => {
  const module = await import("../features/centers/screens/CatalogScreen");
  return { default: module.CatalogScreen };
});

const CenterDetailRoute = lazy(async () => {
  const module = await import("../features/centers/screens/CenterDetailRoute");
  return { default: module.CenterDetailRoute };
});

function RouteFallback() {
  return (
    <section className="screen screen--list">
      <div className="screen__content">
        <section className="state-card state-card--loading">
          <span className="state-card__eyebrow">Cargando ruta</span>
          <h2 className="state-card__title">Preparando la pantalla</h2>
          <p className="state-card__body">Montamos la vista y su contexto sin bloquear el shell.</p>
        </section>
      </div>
    </section>
  );
}

export function AppRoutes() {
  return (
    <AppShell topBar={<DesktopTopBar />} bottomNav={<BottomNavBar />}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<TopPicksScreen />} />
          <Route path="/listado" element={<CatalogScreen />} />
          <Route path="/centers/:slug" element={<CenterDetailRoute />} />
          <Route path="/map" element={<Navigate to="/listado" replace />} />
          <Route path="/search" element={<Navigate to="/listado" replace />} />
          <Route path="/saved" element={<Navigate to="/listado" replace />} />
          <Route path="/profile" element={<Navigate to="/listado" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
