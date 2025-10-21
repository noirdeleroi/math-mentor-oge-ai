// src/types/simulation.ts
export type SimulationProps = {
  onClose?: () => void;  // Simulation can call this to close the modal
  seed?: number;         // Optional seed for randomness
  userId?: string;       // Pass current user if you need it
  // add more shared props later as needed
};
