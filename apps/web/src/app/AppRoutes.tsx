import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { BottomNavBar } from "../features/navigation/BottomNavBar";
import { DesktopTopBar } from "../features/navigation/DesktopTopBar";
import { CatalogScreen } from "../features/centers/screens/CatalogScreen";
import { CenterDetailRoute } from "../features/centers/screens/CenterDetailRoute";
import { TopPicksScreen } from "../features/centers/screens/TopPicksScreen";

export function AppRoutes() {
  return (
    <AppShell topBar={<DesktopTopBar />} bottomNav={<BottomNavBar />}>
      <Routes>
        <Route path="/" element={<TopPicksScreen />} />
        <Route path="/listado" element={<CatalogScreen />} />
        <Route path="/centers/:slug" element={<CenterDetailRoute />} />
        <Route path="/map" element={<Navigate to="/listado" replace />} />
        <Route path="/search" element={<Navigate to="/listado" replace />} />
        <Route path="/saved" element={<Navigate to="/listado" replace />} />
        <Route path="/profile" element={<Navigate to="/listado" replace />} />
      </Routes>
    </AppShell>
  );
}
