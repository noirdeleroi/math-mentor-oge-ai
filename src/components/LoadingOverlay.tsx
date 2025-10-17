// src/components/LoadingOverlay.tsx
import React from "react";
import Loading from "@/components/ui/Loading";

type LoadingVariant = "ring" | "dots" | "ring-dots";
type LoadingSize = "sm" | "md" | "lg";

interface LoadingOverlayProps {
  /** Главный текст под анимацией */
  message?: string;
  /** Дополнительная строка под сообщением (мельче) */
  subMessage?: string;
  /** Тип анимации: кольцо, точки или оба вместе */
  variant?: LoadingVariant;
  /** Размер спиннера/точек */
  size?: LoadingSize;
  /** Доп. классы-обёртки (передаются внутрь Loading) */
  className?: string;
  /** Кастомные классы текста сообщения */
  textClassName?: string;
}

/**
 * Полноэкранный оверлей загрузки,
 * визуально совпадает со стилем из src/components/ui/Loading.tsx.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Загрузка...",
  subMessage,
  variant = "ring-dots",
  size = "lg",
  className,
  textClassName,
}) => {
  return (
    <Loading
      fullscreen
      overlay
      variant={variant}
      message={message}
      subMessage={subMessage}
      size={size}
      className={className}
      textClassName={textClassName}
    />
  );
};

export default LoadingOverlay;
