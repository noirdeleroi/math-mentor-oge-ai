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
  const [scale, setScale] = useState(0.5); // default shrink

  // Compute a scale that fits both width & height, then make it a bit smaller (0.9x) to avoid scroll.
  useLayoutEffect(() => {
    function recompute() {
      const vp = viewportRef.current;
      const hdr = headerWrapperRef.current;
      if (!vp || !hdr) return;

      // Available space inside DialogContent
      const dialog = vp.parentElement as HTMLElement; // DialogContent root
      const dialogH = dialog?.clientHeight ?? window.innerHeight * 0.5;
      const headerH = hdr.clientHeight;
      const availableH = Math.max(0, dialogH - headerH);
      const availableW = vp.clientWidth;

      // “Full screen” size that sims expect
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Fit scale, then reduce a bit (10%) so it’s comfortably smaller
      const fit = Math.min(availableW / winW, availableH / winH);
      const comfy = fit * 0.9;

      // Clamp to a sane range so super small screens don’t explode layout
      const safe = Math.min(Math.max(comfy, 0.25), 0.8);
      setScale(safe);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ Keep the box as-is: half-screen */}
      <DialogContent className="p-0 gap-0 w-[50vw] h-[50vh] max-w-none overflow-hidden">
        <div ref={headerWrapperRef}>
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
        </div>

        {/* Viewport keeps overflow-auto so you *can* scroll if needed */}
        <div ref={viewportRef} className="relative w-full h-[calc(100%-0px)] overflow-auto">
          {simulationId && Comp ? (
            <Suspense
              fallback={
                <div className="grid place-items-center h-full text-muted-foreground text-sm">
                  Загружаем…
                </div>
              }
            >
              {/* Fake full-screen stage scaled down */}
              <div
                className="absolute top-0 left-0 origin-top-left"
                style={{
                  width: `${window.innerWidth}px`,
                  height: `${window.innerHeight}px`,
                  transform: `scale(${scale})`,
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
