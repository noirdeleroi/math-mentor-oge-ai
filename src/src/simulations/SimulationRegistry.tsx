// src/simulations/SimulationRegistry.tsx
import React from "react";
import { SimulationProps } from "@/types/simulation";

const Divisibility = React.lazy(() => import("./Divisibility"));           // Признаки делимости
const ScientificNotation = React.lazy(() => import("./ScientificNotation"));// Научная запись числа

export type SimulationId = "divisibility" | "sci-notation";

export type SimulationMeta = {
  id: SimulationId;
  title: string;
  description?: string;
  defaultProps?: Partial<SimulationProps>;
  component: React.LazyExoticComponent<React.ComponentType<SimulationProps>>;
};

export const SIMULATIONS: Record<SimulationId, SimulationMeta> = {
  "divisibility": {
    id: "divisibility",
    title: "Признаки делимости",
    description: "Выбирай числа, которые делятся на 2, 3, 5, 9, 10.",
    component: Divisibility,
    defaultProps: { seed: 42 }
  },
  "sci-notation": {
    id: "sci-notation",
    title: "Scientific notation (Научная запись)",
    description: "Тренируй представление чисел в научной форме и обратное преобразование.",
    component: ScientificNotation
  }
};
