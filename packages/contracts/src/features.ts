export type FeatureConfidence = "high" | "medium" | "low";

export interface CenterFeature {
  code: string;
  label: string;
  icon: string;
  confidence: FeatureConfidence;
  card_visible: boolean;
  filterable: boolean;
}

export interface CenterFeatureEvidence {
  source_type: "source_record" | "schedule" | "manual_inference";
  source_field: string;
  excerpt: string;
  confidence: FeatureConfidence;
}
