// src/simulations/SimulationRegistry.ts
import React from "react";
import type { SimulationProps } from "@/types/simulation";

const ScientificNotationSimulation = React.lazy(
  () => import("./ScientificNotationSimulation")
);

export type SimulationId = "scientific-notation" /* | другие */;

export const SIMULATIONS: Record<
  SimulationId,
  {
    title: string;
    component: React.ComponentType<SimulationProps>;
    defaultProps?: Partial<SimulationProps>;
  }
> = {
  "scientific-notation": {
    title: "Научная запись чисел",
    component: ScientificNotationSimulation,
    defaultProps: {},
  },
};
