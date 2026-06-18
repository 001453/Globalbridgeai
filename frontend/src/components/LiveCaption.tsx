"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MicSidebar } from "@/components/shared/MicSidebar";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { SubtitleOverlay } from "@/components/SubtitleOverlay";
import { useAudioCapture, useTabAudioCapture } from "@/hooks/useAudioCapture";
import { useMicDevices } from "@/hooks/useMicDevices";
import { useMicSettings } from "@/hooks/useMicSettings";
import { useWebSocket } from "@/hooks/useWebSocket";
import { LANGUAGES } from "@/lib/languages";
import { cn, formatLatency } from "@/lib/utils";
import { Mic, MicOff, Monitor, Radio, Square, Wifi, WifiOff } from "lucide-react";

export function LiveCaption() {
  const {
    connected,
    connect,
    disconnect,
    startSession,
    stopSession,
    sendAudio,
    caption,
    history,
    lastPipeline,
    summary,
    error,
  } = useWebSocket();

  const { settings, update, ready: settingsReady } = useMicSettings();
  const { devices, requestPermission } = useMicDevices();
  const [sessionActive, setSessionActive] = useState(false);
  const [langA, setLangA] = useState("tr");
  const [langB, setLangB] = useState("en");

  const onChunk = useCallback(
    (pcm: ArrayBuffer) => {
      if (sessionActive) sendAudio(pcm);
    },
    [sessionActive, sendAudio]
  );

  const { recording, start, stop, setDeviceId, deviceId } = useAudioCapture(onChunk);
  const { capturing, startTabCapture, stopTabCapture } = useTabAudioCapture(onChunk);

  const handleStopRef = useRef<() => void>(() => {});
  const handleStartRef = useRef<() => void>(() => {});

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (!settingsReady) return;
    setDeviceId(settings.deviceId || undefined);
    requestPermission();
  }, [settingsReady, settings.deviceId, setDeviceId, requestPermission]);

  const handleStart = useCallback(() => {
    startSession({
      source_lang: "auto",
      target_lang: langB,
      bidirectional: settings.bidirectional,
      lang_a: langA,
      lang_b: langB,
    });
    setSessionActive(true);
    start();
  }, [startSession, langB, settings.bidirectional, langA, langB, start]);

  const handleStop = useCallback(() => {
    stop();
    stopTabCapture();
    stopSession(langB);
    setSessionActive(false);
  }, [stop, stopTabCapture, stopSession, langB]);

  handleStartRef.current = handleStart;
  handleStopRef.current = handleStop;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        sessionActive ? handleStopRef.current() : handleStartRef.current();
      }
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        if (!sessionActive) return;
        recording ? stop() : start();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sessionActive, recording, start, stop]);

  const openPiP = async () => {
    if (!document.pictureInPictureEnabled) return;
    const el = document.getElementById("caption-pip-source");
    if (el && el instanceof HTMLVideoElement) {
      await el.requestPictureInPicture();
    }
  };

  return (
    <div className="space-y-4">
      <div className="gb-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 className="text-lg font-semibold">Canlı Altyazı</h1>
          <p className="text-sm text-[var(--gb-muted)]">
            Zoom · Meet · Teams — mikrofon ve kısayol ayarları burada
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <span className="flex items-center gap-1 text-[var(--gb-success)]">
              <Wifi className="h-4 w-4" /> Bağlı
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[var(--gb-danger)]">
              <WifiOff className="h-4 w-4" /> Bağlantı yok
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--gb-danger)]/40 bg-[var(--gb-danger)]/10 px-4 py-3 text-sm text-[var(--gb-danger)]">
          {error}
        </div>
      )}

      <PrivacyBanner />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="gb-card overflow-hidden">
            <div className="gb-panel-head">Diller</div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--gb-muted)]">Dil A</label>
                <select
                  className="gb-select"
                  value={langA}
                  onChange={(e) => setLangA(e.target.value)}
                  disabled={sessionActive}
                >
                  {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--gb-muted)]">Dil B</label>
                <select
                  className="gb-select"
                  value={langB}
                  onChange={(e) => setLangB(e.target.value)}
                  disabled={sessionActive}
                >
                  {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.bidirectional}
                  onChange={(e) => update({ bidirectional: e.target.checked })}
                  disabled={sessionActive}
                />
                Çift yönlü çeviri (A↔B otomatik algılama)
              </label>
            </div>
          </div>

          <div className="gb-card p-4">
            <div className="flex flex-wrap gap-2">
              {!sessionActive ? (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!connected}
                  className="gb-btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Radio className="h-4 w-4" />
                  Oturumu Başlat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex items-center gap-2 rounded-lg bg-[var(--gb-danger)] px-4 py-2 text-sm font-medium text-white"
                >
                  <Square className="h-4 w-4" />
                  Oturumu Bitir
                </button>
              )}

              <button
                type="button"
                onClick={recording ? stop : start}
                disabled={!sessionActive}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium",
                  recording
                    ? "border-[var(--gb-danger)] text-[var(--gb-danger)]"
                    : "border-[var(--gb-border)]"
                )}
              >
                {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {recording ? "Mikrofon Kapalı" : "Mikrofon"}
              </button>

              <button
                type="button"
                onClick={capturing ? stopTabCapture : startTabCapture}
                disabled={!sessionActive}
                className="flex items-center gap-2 rounded-lg border border-[var(--gb-border)] px-4 py-2 text-sm font-medium"
              >
                <Monitor className="h-4 w-4" />
                {capturing ? "Sekme sesi durdur" : "Toplantı sekmesi"}
              </button>

              <button
                type="button"
                onClick={openPiP}
                className="rounded-lg border border-[var(--gb-border)] px-4 py-2 text-sm font-medium"
              >
                PiP Overlay
              </button>
            </div>

            {lastPipeline && (
              <div className="mt-4 rounded-lg border border-[var(--gb-border)] bg-[var(--gb-surface-2)] px-3 py-2 text-sm">
                <span className="font-medium">Gecikme: </span>
                <span
                  className={cn(
                    lastPipeline.total_ms <= 2000 ? "text-[var(--gb-success)]" : "text-[var(--gb-warning)]"
                  )}
                >
                  {formatLatency(lastPipeline.total_ms)}
                </span>
                <span className="ml-3 text-[var(--gb-muted)]">
                  STT {formatLatency(lastPipeline.stt_ms)} · Çeviri {formatLatency(lastPipeline.translation_ms)}
                </span>
              </div>
            )}
          </div>

          <div className="gb-card overflow-hidden">
            <div className="gb-panel-head">Transkript ({history.length})</div>
            <div className="max-h-64 space-y-2 overflow-y-auto p-4 text-sm">
              {history.length === 0 && (
                <p className="text-[var(--gb-muted)]">Konuşma başladığında transkript burada görünür.</p>
              )}
              {history.map((h, i) => (
                <div key={h.id || i} className="border-b border-[var(--gb-border)] pb-2">
                  <div className="font-medium text-[var(--gb-accent)]">{h.translated}</div>
                  <div className="text-[var(--gb-muted)]">{h.original}</div>
                </div>
              ))}
            </div>
          </div>

          {summary && (
            <div className="gb-card border-[var(--gb-success)]/30 p-4">
              <h2 className="mb-2 font-semibold text-[var(--gb-success)]">Toplantı Özeti</h2>
              <p className="text-sm">{summary.summary}</p>
              {summary.action_items && summary.action_items.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-[var(--gb-muted)]">
                  {summary.action_items.map((a, i) => (
                    <li key={i}>
                      {a.task} — {a.assignee}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <MicSidebar
          mode="live"
          devices={devices}
          deviceId={deviceId || settings.deviceId}
          onDeviceChange={(id) => {
            update({ deviceId: id });
            setDeviceId(id || undefined);
          }}
          listening={recording}
          onMicToggle={() => (recording ? stop() : start())}
          supported
          fontSize={settings.fontSize}
          onFontSizeChange={(n) => update({ fontSize: n })}
          sessionActive={sessionActive}
        />
      </div>

      <SubtitleOverlay
        caption={
          caption
            ? {
                ...caption,
                style: {
                  fontSizePx: settings.fontSize,
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
                },
              }
            : null
        }
      />

      <video id="caption-pip-source" className="hidden" />
    </div>
  );
}
