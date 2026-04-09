import React from "react";
import type { ReactNode } from "react";

interface AnimatedContentProps {
  children: ReactNode;
  distance?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  duration?: number;
  ease?: string | ((progress: number) => number);
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
  onComplete?: () => void;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 100,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  onComplete,
}) => {
  const translate = direction === "horizontal"
    ? `translate3d(${reverse ? -distance : distance}px, 0, 0)`
    : `translate3d(0, ${reverse ? -distance : distance}px, 0)`;

  return (
    <div
      style={{
        opacity: animateOpacity ? initialOpacity : 1,
        transform: scale !== 1 ? `${translate} scale(${scale})` : translate,
        transition: `transform ${duration}s ${typeof ease === "string" ? ease : "ease-out"} ${delay}s, opacity ${duration}s ${typeof ease === "string" ? ease : "ease-out"} ${delay}s`,
      }}
      onTransitionEnd={onComplete}
      data-threshold={threshold}
    >
      {children}
    </div>
  );
};

export default AnimatedContent;
