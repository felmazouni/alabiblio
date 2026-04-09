import Dock from "../../components/reactbits/Dock";
import {
  Sparkles,
  List,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const ITEMS = [
  { to: "/", label: "Top 3", icon: Sparkles },
  { to: "/listado", label: "Listado", icon: List },
];

export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  if (ITEMS.length <= 1) {
    return null;
  }

  return (
    <div className="bottom-nav">
      <Dock
        className="bottom-nav__dock"
        items={ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return {
            label: item.label,
            ariaLabel: item.label,
            onClick: () => navigate(item.to),
            className: active ? "bottom-nav__item bottom-nav__item--active" : "bottom-nav__item",
            icon: <Icon size={20} strokeWidth={2.1} />,
          };
        })}
      />
    </div>
  );
}
