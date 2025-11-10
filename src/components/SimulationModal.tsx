// src/components/SimulationModal.tsx
import * as React from "react";
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
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

  const contentRef = useRef<HTMLDivElement | null>(null);
  const headerWrapperRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const recalcViewport = () => {
      if (!contentRef.current || !viewportRef.current) return;
      const headerHeight = headerWrapperRef.current?.offsetHeight ?? 0;
      const contentHeight = contentRef.current.clientHeight;
      const nextHeight = Math.max(contentHeight - headerHeight, 260);
      setViewportHeight(nextHeight);
    };

    recalcViewport();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => recalcViewport());
      if (contentRef.current) resizeObserver.observe(contentRef.current);
      if (headerWrapperRef.current) resizeObserver.observe(headerWrapperRef.current);
    }

    window.addEventListener("resize", recalcViewport);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", recalcViewport);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      if (!contentRef.current || !viewportRef.current) return;
      const headerHeight = headerWrapperRef.current?.offsetHeight ?? 0;
      const contentHeight = contentRef.current.clientHeight;
      const nextHeight = Math.max(contentHeight - headerHeight, 260);
      setViewportHeight(nextHeight);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, simulationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Более компактное и адаптивное модальное окно */}
      <DialogContent
        ref={contentRef}
        className="
          p-0 gap-0
          w-[96vw] sm:w-[94vw]
          h-[95vh]
          max-w-none
          overflow-hidden
        "
      >
        {/* Заголовок */}
        <div
          ref={headerWrapperRef}
          className="px-4 sm:px-6 pt-4 pb-2 border-b border-gray-200/60 bg-white"
        >
          <div className="flex items-center justify-center">
            <DialogTitle className="text-base sm:text-lg font-semibold text-gray-900">
              {titleOverride ?? meta?.title ?? "Симуляция"}
            </DialogTitle>
          </div>
        </div>

        {/* Основная зона под симуляцию */}
        <div
          ref={viewportRef}
          className="
            relative
            w-full
            flex-1
            overflow-auto
            bg-transparent
          "
          style={
            viewportHeight
              ? {
                  height: viewportHeight,
                  maxHeight: viewportHeight,
                }
              : undefined
          }
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
              <div className="w-full h-full flex items-stretch">
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
