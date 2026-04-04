import type { OriginPreset } from "@alabiblio/contracts/origin";

type OriginPresetsRowProps = {
  presets: OriginPreset[];
  onSelect: (preset: OriginPreset) => void;
};

export function OriginPresetsRow({
  presets,
  onSelect,
}: OriginPresetsRowProps) {
  return (
    <div className="origin-presets-row">
      {presets.map((preset) => (
        <button
          key={preset.code}
          type="button"
          className="origin-presets-row__chip"
          onClick={() => onSelect(preset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
