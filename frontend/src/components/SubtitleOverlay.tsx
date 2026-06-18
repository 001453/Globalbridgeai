"use client";

import { useEffect, useState } from "react";
import type { CaptionLine, CaptionStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SubtitleOverlayProps {
  caption: CaptionLine | null;
  visible?: boolean;
  className?: string;
}

const DEFAULT_STYLE: CaptionStyle = {
  fontSizePx: 32,
  fontFamily: "'Segoe UI', 'Noto Sans', system-ui, sans-serif",
  textColor: "#FFFFFF",
  backgroundColor: "rgba(0, 0, 0, 0.72)",
  paddingPx: 16,
  borderRadiusPx: 8,
  maxWidthPercent: 90,
  position: "bottom",
  bottomOffsetPx: 80,
  textShadow: "0 2px 8px rgba(0,0,0,0.9)",
  rtl: false,
};

export function SubtitleOverlay({ caption, visible = true, className }: SubtitleOverlayProps) {
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState<CaptionLine | null>(null);

  useEffect(() => {
    if (caption && visible) {
      setCurrent(caption);
      setShow(true);
    } else if (!caption) {
      setShow(false);
      const t = setTimeout(() => setCurrent(null), 300);
      return () => clearTimeout(t);
    }
  }, [caption, visible]);

  if (!current) return null;

  const style = { ...DEFAULT_STYLE, ...current.style };
  const isRtl = style.rtl || ["ar", "he", "fa", "ur"].includes(current.target_lang);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[9999] flex justify-center px-4",
        style.position === "top" ? "top-8" : "bottom-0",
        className
      )}
      style={{
        paddingBottom: style.position === "bottom" ? style.bottomOffsetPx : undefined,
      }}
      aria-live="polite"
      role="status"
    >
      <div
        className={cn(
          "animate-caption-in text-center transition-opacity",
          !show && "animate-caption-out"
        )}
        style={{
          maxWidth: `${style.maxWidthPercent}%`,
          backgroundColor: style.backgroundColor,
          color: style.textColor,
          fontSize: style.fontSizePx,
          fontFamily: style.fontFamily,
          padding: style.paddingPx,
          borderRadius: style.borderRadiusPx,
          textShadow: style.textShadow,
          direction: isRtl ? "rtl" : "ltr",
          lineHeight: 1.4,
        }}
      >
        {current.speaker && (
          <div className="mb-1 text-sm opacity-70" style={{ fontSize: style.fontSizePx * 0.55 }}>
            {current.speaker}
          </div>
        )}
        <div className="font-semibold leading-snug">{current.translated}</div>
        {current.original !== current.translated && (
          <div
            className="mt-2 opacity-60"
            style={{ fontSize: style.fontSizePx * 0.65 }}
          >
            {current.original}
          </div>
        )}
      </div>
    </div>
  );
}
