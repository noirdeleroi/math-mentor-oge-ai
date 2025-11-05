// src/components/SimulationModal.tsx
import * as React from "react";
import { Suspense, useMemo, useRef } from "react";
import { SIMULATIONS, type SimulationId } from "@/simulations/SimulationRegistry";
import type { SimulationProps } from "@/types/simulation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
    () => ({
      onClose: () => onOpenChange(false),
      ...(meta?.defaultProps ?? {}),
      ...(simulationProps ?? {}),
    }),
    [onOpenChange, meta, simulationProps]
  );

  const headerWrapperRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Более компактное и адаптивное модальное окно */}
      <DialogContent
        className="
          p-0 gap-0
          w-[96vw] sm:w-[90vw]
          max-w-[780px]
          max-h-[90vh]
          overflow-hidden
          rounded-3xl
        "
      >
        {/* Заголовок */}
        <div ref={headerWrapperRef}>
          <DialogHeader className="px-4 sm:px-6 pt-4 pb-3">
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              {titleOverride ?? meta?.title ?? "Симуляция"}
            </DialogTitle>
            {!!meta?.description && (
              <DialogDescription className="text-xs sm:text-sm text-gray-600">
                {meta.description}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Основная зона под симуляцию */}
        <div
          ref={viewportRef}
          className="
            relative
            w-full
            flex-1
            overflow-auto
            bg-gray-50
            px-2 sm:px-4 pb-4
          "
        >
          {simulationId && Comp ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Загружаем симуляцию…
                </div>
              }
            >
              {/* Центруем симуляцию без дополнительного scale */}
              <div className="w-full flex justify-center items-start">
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
