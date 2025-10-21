import * as React from "react";
import { Suspense, useMemo, useRef, useLayoutEffect, useState } from "react";
import { SIMULATIONS, type SimulationId } from "@/simulations/SimulationRegistry";
import type { SimulationProps } from "@/types/simulation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * Auto-fit scaler:
 * - Modal: 50vw x 40vh (shorter to avoid scroll)
 * - We measure the header, then fit the simulation into the remaining space.
 * - The sim renders as if it were full screen (window.innerWidth x window.innerHeight),
 *   then we scale it down by `min(containerW / windowW, containerH / windowH)`.
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

  const headerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  // compute scale to fit both width & height of the viewport (no scrollbars)
  useLayoutEffect(() => {
    function recompute() {
      const vp = viewportRef.current;
      const hdr = headerRef.current;
      if (!vp || !hdr) return;

      // available size = DialogContent (40vh) minus header height
      const dialogH = vp.parentElement?.clientHeight ?? window.innerHeight * 0.4;
      const headerH = hdr.clientHeight;
      const availableH = Math.max(0, dialogH - headerH);
      const availableW = vp.clientWidth;

      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // scale must satisfy both dimensions
      const s = Math.min(availableW / winW, availableH / winH);

      // clamp a bit lower than 0.6 to ensure breathing room on tiny screens
      const safe = Math.min(Math.max(s, 0.25), 0.58);
      setScale(safe);
    }

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* exact 50vw x 40vh; overflow hidden to guarantee no scrollbars */}
      <DialogContent className="p-0 gap-0 w-[50vw] h-[40vh] max-w-none overflow-hidden">
        <DialogHeader ref={headerRef as any} className="px-4 pt-3 pb-2">
          <DialogTitle className="text-sm sm:text-base">
            {titleOverride ?? meta?.title ?? "Симуляция"}
          </DialogTitle>
          {!!meta?.description && (
            <DialogDescription className="text-[11px] sm:text-xs">
              {meta.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* viewport that the sim must fit into (no scroll) */}
        <div ref={viewportRef} className="relative w-full h-[calc(100%-0px)] overflow-hidden">
          {simulationId && Comp ? (
            <Suspense
              fallback={
                <div className="grid place-items-center h-full text-muted-foreground text-sm">
                  Загружаем…
                </div>
              }
            >
              {/* Fake full-screen stage scaled down to fit */}
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
