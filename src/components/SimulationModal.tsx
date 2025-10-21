// src/components/SimulationModal.tsx
import * as React from "react";
import { Suspense, useMemo } from "react";
import { SIMULATIONS, type SimulationId } from "@/simulations/SimulationRegistry";
import type { SimulationProps } from "@/types/simulation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Scale 0.5 “shrinks” a full-screen (100vw x 100svh) sim so it fits
 * into a 50vw x 50vh modal perfectly.
 * We give the inner wrapper 200vw x 200svh then scale 0.5.
 * This way, sims that use min-h-screen / min-h-svh still think
 * they’re full screen, but the user sees a crisp half-size view.
 */

export default function SimulationModal({
  open,
  onOpenChange,
  simulationId,
  simulationProps,
  titleOverride,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulationId: SimulationId | null;
  simulationProps?: Partial<SimulationProps>;
  titleOverride?: string;
}) {
  const meta = simulationId ? SIMULATIONS[simulationId] : null;
  const Comp = meta?.component;

  const mergedProps: SimulationProps = useMemo(
    () => ({ onClose: () => onOpenChange(false), ...(meta?.defaultProps ?? {}), ...(simulationProps ?? {}) }),
    [onOpenChange, meta, simulationProps]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* exact half-screen window */}
      <DialogContent
        className="p-0 gap-0 w-[50vw] h-[50vh] max-w-none overflow-hidden"
      >
        <DialogHeader className="px-4 pt-3 pb-2">
          <DialogTitle className="text-lg">
            {titleOverride ?? meta?.title ?? "Симуляция"}
          </DialogTitle>
          {!!meta?.description && (
            <DialogDescription className="text-xs">
              {meta.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Viewport for the scaled content */}
        <div className="relative w-full h-[calc(50vh-64px)] overflow-hidden">
          {simulationId && Comp ? (
            <Suspense
              fallback={
                <div className="grid place-items-center h-full text-muted-foreground text-sm">
                  Загружаем…
                </div>
              }
            >
              {/* 
                Scale wrapper:
                - Make a “fake fullscreen” canvas (200vw x 200svh)
                - Scale it down to 0.5 so it appears as half-size
                - Stick to the top-left to avoid offset blur
              */}
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{
                  width: "200vw",
                  height: "200svh",
                  transform: "scale(0.5)",
                  transformOrigin: "top left",
                }}
              >
                <Comp {...mergedProps} />
              </div>
            </Suspense>
          ) : (
            <div className="grid place-items-center h-full text-muted-foreground text-sm">
              Выберите симуляцию.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
