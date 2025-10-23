// src/components/FlyingCyrillicBackground.tsx
import React, { useRef } from "react";
import useFlyingCyrillicBackground from "@/hooks/useFlyingCyrillicBackground";

type Props = {
  /** Tailwind classes to layer/position it if needed */
  className?: string;
  /** Number of symbols */
  count?: number;
  /** RGB color for glyphs/lines */
  color?: [number, number, number];
  /** Link distance for connecting lines */
  linkDist?: number;
  /** Global opacity 0..1 */
  opacity?: number;
};

const FlyingCyrillicBackground: React.FC<Props> = ({
  className = "fixed inset-0 z-0 pointer-events-none",
  count,
  color,
  linkDist,
  opacity,
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  useFlyingCyrillicBackground(parentRef, { count, color, linkDist, opacity });

  return <div ref={parentRef} className={className} aria-hidden="true" />;
};

export default FlyingCyrillicBackground;
