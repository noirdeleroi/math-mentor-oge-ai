import React, { createContext, useContext, useState, useCallback } from "react";
import SimulationModal from "@/components/SimulationModal";
import type { SimulationId } from "@/simulations/SimulationRegistry";
import type { SimulationProps } from "@/types/simulation";

type Ctx = {
  open: (id: SimulationId, props?: Partial<SimulationProps>) => void;
  close: () => void;
};

const SimulationCtx = createContext<Ctx | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [openState, setOpen] = useState(false);
  const [simId, setSimId] = useState<SimulationId | null>(null);
  const [props, setProps] = useState<Partial<SimulationProps>>();

  const open = useCallback((id: SimulationId, p?: Partial<SimulationProps>) => {
    setSimId(id);
    setProps(p);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return (
    <SimulationCtx.Provider value={{ open, close }}>
      {children}
      <SimulationModal
        open={openState}
        onOpenChange={setOpen}
        simulationId={simId}
        simulationProps={props}
      />
    </SimulationCtx.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationCtx);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
