// src/components/SimulationModal.tsx
import * as React from "react";
import { Suspense, useMemo } from "react";
import { SIMULATIONS, SimulationId } from "@/simulations/SimulationRegistry";
import { SimulationProps } from "@/types/simulation";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Size = "sm" | "md" | "lg" | "xl" | "full";
const SIZE_CLASS: Record<Size, string> = {
  sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl", full: "max-w-[96vw]"
};

export default function SimulationModal({
  open, onOpenChange, simulationId, simulationProps, titleOverride, size = "xl", className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulationId: SimulationId | null;
  simulationProps?: Partial<SimulationProps>;
  titleOverride?: string;
  size?: Size;
  className?: string;
}) {
  const meta = simulationId ? SIMULATIONS[simulationId] : null;
  const Comp = meta?.component;

  const mergedProps: SimulationProps = useMemo(
    () => ({ onClose: () => onOpenChange(false), ...(meta?.defaultProps ?? {}), ...(simulationProps ?? {}) }),
    [onOpenChange, meta, simulationProps]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 w-[96vw] h-[88vh] overflow-hidden", SIZE_CLASS[size], className)}>
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="text-2xl">{titleOverride ?? meta?.title ?? "Симуляция"}</DialogTitle>
          {!!meta?.description && <DialogDescription>{meta.description}</DialogDescription>}
        </DialogHeader>
        <div className="px-6 pb-6 h-[calc(88vh-96px)]">
          <ScrollArea className="h-full rounded-lg border">
            <div className="p-4 h-full">
              {simulationId && Comp ? (
                <Suspense fallback={<div className="grid place-items-center h-[60vh] text-muted-foreground">Загружаем…</div>}>
                  <Comp {...mergedProps} />
                </Suspense>
              ) : (
                <div className="grid place-items-center h-[60vh] text-muted-foreground">Выберите симуляцию.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
