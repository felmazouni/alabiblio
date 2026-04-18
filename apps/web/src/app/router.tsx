import { createBrowserRouter, Navigate } from "react-router-dom";
import { CenterDetailRoute } from "../routes/CenterDetailRoute";
import { CenterAdminRoute } from "../routes/CenterAdminRoute";
import { GlobalAdminRoute } from "../routes/GlobalAdminRoute";
import { HomeRoute } from "../routes/HomeRoute";
import { PublicCatalogRoute } from "../routes/PublicCatalogRoute";
import { TopOptionsRoute } from "../routes/TopOptionsRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomeRoute />
  },
  {
    path: "/top",
    element: <TopOptionsRoute />
  },
  {
    path: "/listado",
    element: <PublicCatalogRoute />
  },
  {
    path: "/catalogo",
    element: <Navigate replace to="/listado" />
  },
  {
    path: "/centros/:slug",
    element: <CenterDetailRoute />
  },
  {
    path: "/admin/centro",
    element: <CenterAdminRoute />
  },
  {
    path: "/admin/global",
    element: <GlobalAdminRoute />
  }
]);
