import type {
  CenterFeature,
  CenterFeatureEvidence,
} from "@alabiblio/contracts/features";

type FeatureDefinition = {
  code: string;
  label: string;
  icon: string;
  card_visible: boolean;
  filterable: boolean;
  patterns?: RegExp[];
};

type InferenceInput = {
  wifiFlag: boolean;
  socketsFlag: boolean;
  accessibilityFlag: boolean;
  openAirFlag: boolean;
  capacityValue: number | null;
  equipmentText: string | null;
  descriptionText: string | null;
  notesText: string | null;
  rawScheduleText: string | null;
};

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  { code: "wifi", label: "WiFi", icon: "Wifi", card_visible: true, filterable: true },
  { code: "sockets", label: "Enchufes", icon: "Plug", card_visible: true, filterable: true },
  { code: "accessible", label: "Accesible", icon: "Accessibility", card_visible: true, filterable: true },
  { code: "open_air", label: "Aire libre", icon: "Trees", card_visible: true, filterable: true },
  { code: "capacity_nominal", label: "Capacidad nominal", icon: "Users", card_visible: false, filterable: false },
  {
    code: "exam_extension",
    label: "Ampliacion de examenes",
    icon: "GraduationCap",
    card_visible: false,
    filterable: false,
    patterns: [/ampliaci[oó]n.*ex[aá]menes?/i, /ex[aá]menes?/i],
  },
  {
    code: "computers",
    label: "Ordenadores",
    icon: "Monitor",
    card_visible: false,
    filterable: false,
    patterns: [/\bordenadores?\b/i, /\binform[aá]tica\b/i, /\bpc\b/i],
  },
  {
    code: "printer",
    label: "Impresora",
    icon: "Printer",
    card_visible: false,
    filterable: false,
    patterns: [/\bimpresoras?\b/i, /\bimpresi[oó]n\b/i],
  },
  {
    code: "group_rooms",
    label: "Salas de grupo",
    icon: "UsersRound",
    card_visible: false,
    filterable: false,
    patterns: [/\bsalas?\s+de\s+grupo\b/i, /\btrabajo en grupo\b/i],
  },
  {
    code: "climate_control",
    label: "Climatizacion",
    icon: "Fan",
    card_visible: false,
    filterable: false,
    patterns: [/\bclimatizaci[oó]n\b/i, /\baire acondicionado\b/i, /\bcalefacci[oó]n\b/i],
  },
  {
    code: "lockers",
    label: "Taquillas",
    icon: "Lock",
    card_visible: false,
    filterable: false,
    patterns: [/\btaquillas?\b/i, /\bconsignas?\b/i],
  },
  {
    code: "loan_service",
    label: "Prestamo",
    icon: "BookOpen",
    card_visible: false,
    filterable: false,
    patterns: [/\bpr[eé]stamo\b/i, /\bprestamo\b/i],
  },
  {
    code: "newspapers",
    label: "Prensa y revistas",
    icon: "Newspaper",
    card_visible: false,
    filterable: false,
    patterns: [/\bprensa\b/i, /\brevistas?\b/i, /\bhemeroteca\b/i],
  },
  {
    code: "easy_reading",
    label: "Lectura facil",
    icon: "BookMarked",
    card_visible: false,
    filterable: false,
    patterns: [/\blectura f[aá]cil\b/i],
  },
  {
    code: "audio_description",
    label: "Audiodescripcion",
    icon: "Headphones",
    card_visible: false,
    filterable: false,
    patterns: [/\baudiodescripci[oó]n\b/i, /\baudiolibros?\b/i],
  },
  {
    code: "adapted_toilets",
    label: "Aseos adaptados",
    icon: "Bath",
    card_visible: false,
    filterable: false,
    patterns: [/\baseos? adaptados?\b/i, /\bba[nñ]os? adaptados?\b/i],
  },
  {
    code: "silent_study",
    label: "Estudio silencioso",
    icon: "VolumeX",
    card_visible: false,
    filterable: false,
    patterns: [/\bsilencio\b/i, /\bzona silenciosa\b/i, /\bestudio silencioso\b/i],
  },
];

function compactText(value: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function buildSearchText(input: InferenceInput): string {
  return compactText(
    [
      input.equipmentText,
      input.descriptionText,
      input.notesText,
      input.rawScheduleText,
    ].join(" "),
  );
}

function pushFeature(
  registry: Map<string, { feature: CenterFeature; evidence: CenterFeatureEvidence[] }>,
  feature: CenterFeature,
  evidence: CenterFeatureEvidence,
): void {
  const current = registry.get(feature.code);

  if (current) {
    current.evidence.push(evidence);
    if (current.feature.confidence === "medium" && evidence.confidence === "high") {
      current.feature.confidence = "high";
    }
    return;
  }

  registry.set(feature.code, {
    feature,
    evidence: [evidence],
  });
}

function getFeatureDefinition(code: string): FeatureDefinition {
  const definition = FEATURE_DEFINITIONS.find((item) => item.code === code);

  if (!definition) {
    throw new Error(`Unknown feature definition: ${code}`);
  }

  return definition;
}

function buildFeature(
  code: string,
  confidence: CenterFeature["confidence"],
): CenterFeature {
  const definition = getFeatureDefinition(code);

  return {
    code: definition.code,
    label: definition.label,
    icon: definition.icon,
    confidence,
    card_visible: definition.card_visible,
    filterable: definition.filterable,
  };
}

export function inferCenterFeatures(input: InferenceInput): {
  features: CenterFeature[];
  evidenceByCode: Record<string, CenterFeatureEvidence[]>;
} {
  const registry = new Map<
    string,
    { feature: CenterFeature; evidence: CenterFeatureEvidence[] }
  >();
  const searchText = buildSearchText(input);

  if (input.wifiFlag) {
    pushFeature(registry, buildFeature("wifi", "high"), {
      source_type: "source_record",
      source_field: "wifi_flag",
      excerpt: "wifi_flag = true",
      confidence: "high",
    });
  }

  if (input.socketsFlag) {
    pushFeature(registry, buildFeature("sockets", "high"), {
      source_type: "source_record",
      source_field: "sockets_flag",
      excerpt: "sockets_flag = true",
      confidence: "high",
    });
  }

  if (input.accessibilityFlag) {
    pushFeature(registry, buildFeature("accessible", "high"), {
      source_type: "source_record",
      source_field: "accessibility_flag",
      excerpt: "accessibility_flag = true",
      confidence: "high",
    });
  }

  if (input.openAirFlag) {
    pushFeature(registry, buildFeature("open_air", "high"), {
      source_type: "source_record",
      source_field: "open_air_flag",
      excerpt: "open_air_flag = true",
      confidence: "high",
    });
  }

  if (input.capacityValue !== null) {
    pushFeature(registry, buildFeature("capacity_nominal", "high"), {
      source_type: "source_record",
      source_field: "capacity_value",
      excerpt: String(input.capacityValue),
      confidence: "high",
    });
  }

  for (const definition of FEATURE_DEFINITIONS) {
    if (!definition.patterns || searchText === "") {
      continue;
    }

    const matchedPattern = definition.patterns.find((pattern) =>
      pattern.test(searchText),
    );

    if (!matchedPattern) {
      continue;
    }

    const match = searchText.match(matchedPattern)?.[0] ?? definition.label;
    const confidence =
      definition.code === "exam_extension" ? "high" : "medium";

    pushFeature(registry, buildFeature(definition.code, confidence), {
      source_type:
        definition.code === "exam_extension" ? "schedule" : "source_record",
      source_field:
        definition.code === "exam_extension"
          ? "raw_schedule_text"
          : "equipment_text",
      excerpt: match,
      confidence,
    });
  }

  const features = [...registry.values()]
    .map((entry) => entry.feature)
    .sort((left, right) => {
      if (left.card_visible !== right.card_visible) {
        return left.card_visible ? -1 : 1;
      }

      return left.label.localeCompare(right.label, "es");
    });
  const evidenceByCode = Object.fromEntries(
    [...registry.entries()].map(([code, entry]) => [code, entry.evidence]),
  );

  return {
    features,
    evidenceByCode,
  };
}
