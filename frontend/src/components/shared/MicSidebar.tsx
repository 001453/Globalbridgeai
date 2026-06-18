"use client";

import { Keyboard, Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Device = { deviceId: string; label: string };

const LIVE_HOTKEYS = [
  { keys: "Ctrl + Shift + L", action: "Oturumu başlat / bitir" },
  { keys: "Ctrl + Shift + M", action: "Mikrofon aç / kapat" },
];

const DICTATION_HOTKEYS = [
  { keys: "Ctrl + Shift + M", action: "Dikte mikrofonu aç / kapat" },
  { keys: "Enter", action: "Gönder" },
  { keys: "Shift + Enter", action: "Yeni satır" },
];

export function MicSidebar({
  mode,
  devices,
  deviceId,
  onDeviceChange,
  listening,
  onMicToggle,
  supported = true,
  fontSize,
  onFontSizeChange,
  sessionActive,
  statusLabel,
}: {
  mode: "live" | "dictation";
  devices: Device[];
  deviceId: string;
  onDeviceChange: (id: string) => void;
  listening: boolean;
  onMicToggle: () => void;
  supported?: boolean;
  fontSize?: number;
  onFontSizeChange?: (n: number) => void;
  sessionActive?: boolean;
  statusLabel?: string;
}) {
  const hotkeys = mode === "live" ? LIVE_HOTKEYS : DICTATION_HOTKEYS;
  const locked = mode === "live" && sessionActive;

  return (
    <div className="space-y-4 lg:w-72 lg:shrink-0">
      <div className="gb-card overflow-hidden">
        <div className="gb-panel-head flex items-center gap-2">
          <Mic className="h-3.5 w-3.5" />
          Mikrofon
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--gb-muted)]">Giriş cihazı</label>
            <select
              className="gb-select"
              value={deviceId}
              onChange={(e) => onDeviceChange(e.target.value)}
              disabled={locked || listening}
            >
              <option value="">Varsayılan mikrofon</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || "Mikrofon"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onMicToggle}
            disabled={!supported}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition",
              listening
                ? "border-[var(--gb-danger)] bg-[var(--gb-danger)]/10 text-[var(--gb-danger)]"
                : "border-[var(--gb-border)] hover:border-[var(--gb-accent)] hover:text-[var(--gb-accent)]"
            )}
          >
            <Mic className="h-4 w-4" />
            {listening ? "Dinleniyor — durdur" : mode === "live" ? "Mikrofon" : "Dikte başlat"}
          </button>

          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              listening
                ? "border-[var(--gb-danger)] text-[var(--gb-danger)]"
                : "border-[var(--gb-border)] text-[var(--gb-muted)]"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                listening ? "animate-pulse bg-[var(--gb-danger)]" : "bg-[var(--gb-border)]"
              )}
            />
            {statusLabel ||
              (listening
                ? "Konuşun…"
                : mode === "live"
                  ? sessionActive
                    ? "Mikrofon kapalı"
                    : "Oturum bekleniyor"
                  : "Metin alanına dikte edilir")}
          </div>

          {!supported && (
            <p className="text-[0.65rem] text-[var(--gb-danger)]">
              Tarayıcınız ses tanımayı desteklemiyor (Chrome önerilir).
            </p>
          )}

          {mode === "dictation" && (
            <p className="text-[0.65rem] text-[var(--gb-muted)]">
              Konuştuğunuz metin kaynak alanına yazılır; çeviri otomatik gelir.
            </p>
          )}
        </div>
      </div>

      {mode === "live" && fontSize != null && onFontSizeChange && (
        <div className="gb-card overflow-hidden">
          <div className="gb-panel-head flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5" />
            Altyazı
          </div>
          <div className="p-4">
            <label className="mb-2 flex justify-between text-xs text-[var(--gb-muted)]">
              <span>Yazı boyutu</span>
              <span>{fontSize}px</span>
            </label>
            <input
              type="range"
              min={20}
              max={48}
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="w-full accent-[var(--gb-accent)]"
            />
          </div>
        </div>
      )}

      <div className="gb-card overflow-hidden">
        <div className="gb-panel-head flex items-center gap-2">
          <Keyboard className="h-3.5 w-3.5" />
          Kısayol tuşları
        </div>
        <ul className="divide-y divide-[var(--gb-border)] text-sm">
          {hotkeys.map((h) => (
            <li key={h.keys} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <span className="text-[var(--gb-muted)]">{h.action}</span>
              <kbd className="shrink-0 rounded border border-[var(--gb-border)] bg-[var(--gb-surface-2)] px-2 py-0.5 font-mono text-[0.65rem]">
                {h.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
