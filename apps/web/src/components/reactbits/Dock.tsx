"use client";

import React, { useState } from "react";
import "./Dock.css";

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  ariaLabel?: string;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: unknown;
};

export default function Dock({
  items,
  className = "",
  panelHeight = 64,
  baseItemSize = 48,
}: DockProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="dock-outer" style={{ minHeight: panelHeight }}>
      <div
        className={`dock-panel ${className}`.trim()}
        style={{ minHeight: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <button
            key={`${index}-${item.ariaLabel ?? ""}`}
            type="button"
            className={`dock-item ${item.className ?? ""}`.trim()}
            style={{ width: baseItemSize, height: baseItemSize }}
            onClick={item.onClick}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex((current) => (current === index ? null : current))}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
            aria-label={item.ariaLabel}
          >
            <span className="dock-icon">{item.icon}</span>
            {activeIndex === index ? (
              <span className="dock-label" role="tooltip">
                {item.label}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
