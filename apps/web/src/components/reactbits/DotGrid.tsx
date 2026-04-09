import type { CSSProperties } from "react";
import "./DotGrid.css";

export interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  className?: string;
  style?: CSSProperties;
}

const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 12,
  gap = 24,
  baseColor = "rgba(129, 157, 180, 0.18)",
  activeColor = "rgba(0, 158, 223, 0.22)",
  className = "",
  style,
}) => {
  return (
    <div
      className={`dot-grid ${className}`.trim()}
      style={{
        "--dot-grid-dot-size": `${dotSize}px`,
        "--dot-grid-gap": `${gap}px`,
        "--dot-grid-base": baseColor,
        "--dot-grid-accent": activeColor,
        ...style,
      } as CSSProperties}
      aria-hidden="true"
    />
  );
};

export default DotGrid;
