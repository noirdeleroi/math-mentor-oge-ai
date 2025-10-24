import React, { useRef } from "react";
import useFlyingStarsBackground from "@/hooks/useFlyingStarsBackground";

const FlyingStarsBackground: React.FC = () => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  useFlyingStarsBackground(parentRef);

  return (
    <div
      ref={parentRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default FlyingStarsBackground;
