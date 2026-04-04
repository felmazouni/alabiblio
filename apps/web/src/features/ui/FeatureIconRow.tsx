import type { CenterFeature } from "@alabiblio/contracts/features";
import {
  Accessibility,
  Bath,
  BookMarked,
  BookOpen,
  Fan,
  GraduationCap,
  Headphones,
  Lock,
  Monitor,
  Newspaper,
  Plug,
  Printer,
  Trees,
  Users,
  UsersRound,
  VolumeX,
  Wifi,
} from "lucide-react";

const ICONS = {
  Accessibility,
  Bath,
  BookMarked,
  BookOpen,
  Fan,
  GraduationCap,
  Headphones,
  Lock,
  Monitor,
  Newspaper,
  Plug,
  Printer,
  Trees,
  Users,
  UsersRound,
  VolumeX,
  Wifi,
} as const;

type FeatureIconRowProps = {
  features: CenterFeature[];
  limit?: number;
  iconOnly?: boolean;
};

export function FeatureIconRow({
  features,
  limit,
  iconOnly = false,
}: FeatureIconRowProps) {
  const visibleFeatures = limit ? features.slice(0, limit) : features;

  return (
    <div className="feature-icon-row">
      {visibleFeatures.map((feature) => {
        const Icon = ICONS[feature.icon as keyof typeof ICONS] ?? Users;

        return (
          <span
            key={feature.code}
            className={
              iconOnly
                ? "feature-icon-row__item feature-icon-row__item--icon-only"
                : "feature-icon-row__item"
            }
            title={feature.label}
          >
            <Icon size={16} strokeWidth={2} />
            {!iconOnly ? <span>{feature.label}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
