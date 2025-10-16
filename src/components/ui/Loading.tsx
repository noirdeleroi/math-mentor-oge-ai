
import React from "react";

type LoadingVariant = "ring" | "dots" | "ring-dots";

interface LoadingProps {
  variant?: LoadingVariant;
  message?: string;
  subMessage?: string;
  fullscreen?: boolean;        // fills the whole viewport
  overlay?: boolean;           // dims background behind children
  size?: "sm" | "md" | "lg";  // spinner size
  className?: string;          // wrapper class
  textClassName?: string;      // message text class
}

const sizeMap: Record<NonNullable<LoadingProps["size"]>, { ring: string; dots: string }> = {
  sm: { ring: "h-10 w-10", dots: "h-1.5 w-1.5" },
  md: { ring: "h-14 w-14", dots: "h-2 w-2" },
  lg: { ring: "h-20 w-20", dots: "h-2.5 w-2.5" },
};

export default function Loading({
  variant = "ring-dots",
  message = "Загрузка...",
  subMessage,
  fullscreen = false,
  overlay = false,
  size = "md",
  className = "",
  textClassName,
}: LoadingProps) {
  const sz = sizeMap[size];
  const useLightText = overlay || fullscreen;
  const messageTextClass = textClassName ?? (useLightText ? "text-white" : "text-[#1a1f36]");

  const Ring = (
    <div className="relative">
      {/* Outer spinner */}
      <div className={`${sz.ring} border-4 border-white/30 border-t-yellow-500 rounded-full animate-spin`} />
      {/* Inner counter-rotating arc */}
      <div
        className={`absolute inset-0 ${sz.ring} border-4 border-transparent border-r-emerald-500 rounded-full animate-spin`}
        style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
      />
      {/* Soft glow */}
      <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-emerald-500/20 blur-xl" />
    </div>
  );

  const Dots = (
    <div className="flex items-center justify-center gap-1.5">
      <div className={`${sz.dots} rounded-full bg-yellow-500 animate-bounce`} style={{ animationDelay: "0ms" }} />
      <div className={`${sz.dots} rounded-full bg-emerald-500 animate-bounce`} style={{ animationDelay: "120ms" }} />
      <div className={`${sz.dots} rounded-full bg-sky-500 animate-bounce`} style={{ animationDelay: "240ms" }} />
    </div>
  );

  const Content = (
    <div className={`text-center space-y-4 ${className}`} role="status" aria-busy>
      <div className="relative flex items-center justify-center">
        {variant === "ring" && Ring}
        {variant === "dots" && Dots}
        {variant === "ring-dots" && (
          <div className="flex flex-col items-center gap-4">
            {Ring}
            {Dots}
          </div>
        )}
      </div>
      {(message || subMessage) && (
        <div className="space-y-1">
          {message && <p className={`text-base font-medium ${messageTextClass}`}>{message}</p>}
          {subMessage && <p className={`text-sm ${useLightText ? "text-white/80" : "text-gray-600"}`}>{subMessage}</p>}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className={`fixed inset-0 z-50 ${overlay ? "bg-black/40 backdrop-blur-sm" : "bg-transparent"} flex items-center justify-center`}
      >
        {Content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="relative">
        <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px]" />
        <div className="relative z-50 flex items-center justify-center py-8">{Content}</div>
      </div>
    );
  }

  return Content;
}
