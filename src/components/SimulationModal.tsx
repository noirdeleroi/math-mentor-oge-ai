// src/components/SimulationModal.tsx
import * as React from "react";
import { Suspense, useMemo, useRef, useLayoutEffect, useState } from "react";
import { SIMULATIONS, type SimulationId } from "@/simulations/SimulationRegistry";
import type { SimulationProps } from "@/types/simulation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

  const headerWrapperRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ Larger modal for better simulation visibility */}
      <DialogContent className="p-0 gap-0 w-[90vw] h-[85vh] max-w-none overflow-hidden">
        <div ref={headerWrapperRef}>
          <DialogHeader className="px-6 pt-4 pb-3">
            <DialogTitle className="text-xl font-semibold">
              {titleOverride ?? meta?.title ?? "Симуляция"}
            </DialogTitle>
            {!!meta?.description && (
              <DialogDescription className="text-sm text-gray-600">
                {meta.description}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Viewport - render simulation directly */}
        <div ref={viewportRef} className="relative w-full h-[calc(100%-0px)] overflow-auto bg-gray-50">
          {simulationId && Comp ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Загружаем симуляцию…
                </div>
              }
            >
              {/* Render simulation with scaling while keeping no gap */}
              <div 
                className="w-full"
                style={{
                  transform: 'scale(0.85)',
                  transformOrigin: 'top center'
                }}
              >
                <Comp {...mergedProps} />
              </div>
            </Suspense>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Выберите симуляцию.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
