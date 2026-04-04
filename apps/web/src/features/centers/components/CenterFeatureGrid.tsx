import type { CenterFeature } from "@alabiblio/contracts/features";
import { FeatureIconRow } from "../../ui/FeatureIconRow";

type CenterFeatureGridProps = {
  features: CenterFeature[];
};

export function CenterFeatureGrid({ features }: CenterFeatureGridProps) {
  return (
    <div className="center-feature-grid">
      <FeatureIconRow features={features} />
    </div>
  );
}
