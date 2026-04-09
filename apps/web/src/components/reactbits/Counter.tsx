import "./Counter.css";

interface CounterProps {
  value: number;
  fontSize?: number;
  padding?: number;
  places?: number[];
  gap?: number;
  borderRadius?: number;
  horizontalPadding?: number;
  textColor?: string;
  fontWeight?: React.CSSProperties["fontWeight"];
  containerStyle?: React.CSSProperties;
  counterStyle?: React.CSSProperties;
  digitStyle?: React.CSSProperties;
  gradientHeight?: number;
  gradientFrom?: string;
  gradientTo?: string;
  topGradientStyle?: React.CSSProperties;
  bottomGradientStyle?: React.CSSProperties;
}

export default function Counter({
  value,
  fontSize = 100,
  padding = 0,
  places = [100, 10, 1],
  gap = 8,
  borderRadius = 4,
  horizontalPadding = 8,
  textColor = "white",
  fontWeight = "bold",
  containerStyle,
  counterStyle,
  digitStyle,
  gradientHeight = 16,
  gradientFrom = "black",
  gradientTo = "transparent",
  topGradientStyle,
  bottomGradientStyle,
}: CounterProps) {
  const height = fontSize + padding;
  const defaultCounterStyle: React.CSSProperties = {
    fontSize,
    gap: gap,
    borderRadius: borderRadius,
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    color: textColor,
    fontWeight: fontWeight,
  };
  const defaultTopGradientStyle: React.CSSProperties = {
    height: gradientHeight,
    background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
  };
  const defaultBottomGradientStyle: React.CSSProperties = {
    height: gradientHeight,
    background: `linear-gradient(to top, ${gradientFrom}, ${gradientTo})`,
  };
  return (
    <div className="counter-container" style={containerStyle}>
      <div
        className="counter-counter"
        style={{ ...defaultCounterStyle, ...counterStyle }}
      >
        <div className="counter-digit" style={{ height, ...digitStyle }}>
          <span className="counter-number" style={{ transform: "translateY(0)" }}>
            {places.map((place) => Math.floor(value / place) % 10).join("")}
          </span>
        </div>
      </div>
      <div className="gradient-container">
        <div
          className="top-gradient"
          style={topGradientStyle ? topGradientStyle : defaultTopGradientStyle}
        ></div>
        <div
          className="bottom-gradient"
          style={
            bottomGradientStyle
              ? bottomGradientStyle
              : defaultBottomGradientStyle
          }
        ></div>
      </div>
    </div>
  );
}
