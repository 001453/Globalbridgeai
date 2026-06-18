"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PackManagerBar } from "@/components/PackManagerBar";
import { MicSidebar } from "@/components/shared/MicSidebar";
import { useConversation } from "@/hooks/useLocalStore";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";
import { useMicDevices } from "@/hooks/useMicDevices";
import { useMicSettings } from "@/hooks/useMicSettings";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { translateText } from "@/lib/api";
import { LANGUAGES, langName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { Mic, Send, Trash2 } from "lucide-react";

export function ConversationMode() {
  const [langA, setLangA] = useState("tr");
  const [langB, setLangB] = useState("en");
  const [speaker, setSpeaker] = useState<"a" | "b">("a");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const dictationBase = useRef("");

  const { messages, push, clear } = useConversation();
  const { isPairReady } = useLanguagePacks();
  const { settings, update, ready: settingsReady } = useMicSettings();
  const { devices, requestPermission } = useMicDevices();

  const activeLang = speaker === "a" ? langA : langB;

  const onDictation = useCallback((text: string, final: boolean) => {
    if (!text) return;
    if (final) {
      setInput((prev) => {
        const base = dictationBase.current || prev;
        const next = base ? `${base} ${text}`.trim() : text;
        dictationBase.current = next;
        return next;
      });
    } else {
      setInput(() => {
        const base = dictationBase.current;
        return base ? `${base} ${text}` : text;
      });
    }
  }, []);

  const { listening, supported, toggle, stop } = useSpeechDictation(activeLang, onDictation);

  useEffect(() => {
    if (settingsReady) requestPermission();
  }, [settingsReady, requestPermission]);

  useEffect(() => {
    if (listening) dictationBase.current = input;
  }, [listening]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const send = async () => {
    stop();
    const text = input.trim();
    if (!text || loading) return;
    const from = speaker === "a" ? langA : langB;
    const to = speaker === "a" ? langB : langA;
    if (!isPairReady(from, to)) return;
    setLoading(true);
    try {
      const res = await translateText(text, from, to);
      push({ speaker, from, to, source: text, target: res.translated });
      setInput("");
      dictationBase.current = "";
      setSpeaker((s) => (s === "a" ? "b" : "a"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="gb-card overflow-hidden lg:col-span-2">
        <div className="border-b border-[var(--gb-border)] p-4">
          <h1 className="text-lg font-semibold">Konuşma</h1>
          <p className="text-sm text-[var(--gb-muted)]">
            İki yönlü sohbet — mikrofonla dikte veya yazın
          </p>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-[var(--gb-border)] p-3">
          <select className="gb-select max-w-[140px]" value={langA} onChange={(e) => setLangA(e.target.value)}>
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <select className="gb-select max-w-[140px]" value={langB} onChange={(e) => setLangB(e.target.value)}>
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              speaker === "a" && "border-[var(--gb-accent)] text-[var(--gb-accent)]"
            )}
            onClick={() => setSpeaker("a")}
          >
            {langName(langA)}
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              speaker === "b" && "border-[var(--gb-accent)] text-[var(--gb-accent)]"
            )}
            onClick={() => setSpeaker("b")}
          >
            {langName(langB)}
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--gb-muted)]">Mesajlar burada görünür.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "mb-2 rounded-lg border p-3 text-sm",
                m.speaker === "b" && "ml-6 border-[var(--gb-accent)]"
              )}
            >
              <p>{m.source}</p>
              <p className="mt-1 text-[var(--gb-accent)]">{m.target}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--gb-border)] p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--gb-muted)]">
            <span>
              Konuşan: <strong className="text-[var(--gb-text)]">{langName(activeLang)}</strong>
            </span>
            {listening && (
              <span className="flex items-center gap-1 text-[var(--gb-danger)]">
                <Mic className="h-3 w-3 animate-pulse" /> dinleniyor
              </span>
            )}
          </div>
          <textarea
            className="gb-textarea min-h-[72px]"
            placeholder="Yazın veya mikrofonla dikte edin…"
            value={input}
            onChange={(e) => {
              dictationBase.current = e.target.value;
              setInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className={cn(
                "gb-btn-ghost border border-[var(--gb-border)]",
                listening && "border-[var(--gb-danger)] text-[var(--gb-danger)]"
              )}
              onClick={toggle}
            >
              <Mic className="h-4 w-4" />
            </button>
            <button type="button" className="gb-btn-ghost border border-[var(--gb-border)]" onClick={clear}>
              <Trash2 className="h-4 w-4" />
            </button>
            <button type="button" className="gb-btn-primary" onClick={send} disabled={loading || !input.trim()}>
              <Send className="mr-1 inline h-4 w-4" />
              Gönder
            </button>
          </div>
        </div>
        <PackManagerBar from={langA} to={langB} />
      </div>

      <MicSidebar
        mode="dictation"
        devices={devices}
        deviceId={settings.deviceId}
        onDeviceChange={(id) => update({ deviceId: id })}
        listening={listening}
        onMicToggle={toggle}
        supported={supported}
        statusLabel={
          listening
            ? `${langName(activeLang)} dinleniyor…`
            : `Dikte dili: ${langName(activeLang)}`
        }
      />
    </div>
  );
}
