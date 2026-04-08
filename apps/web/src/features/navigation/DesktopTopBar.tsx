import { Navigation } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const DESKTOP_NAV = [
  { to: "/", label: "Top 3" },
  { to: "/listado", label: "Listado" },
];

export function DesktopTopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="desktop-topbar">
      <div className="desktop-topbar__inner">
        <button type="button" className="desktop-topbar__brand" onClick={() => navigate("/")}>
          <div className="desktop-topbar__logo-mark">
            <Navigation size={14} />
          </div>
          <span className="desktop-topbar__wordmark">alabiblio</span>
        </button>
        <nav className="desktop-topbar__nav">
          {DESKTOP_NAV.map((item) => {
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <button
                key={item.to}
                type="button"
                className={`desktop-topbar__nav-item${active ? " desktop-topbar__nav-item--active" : ""}`}
                onClick={() => navigate(item.to)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
