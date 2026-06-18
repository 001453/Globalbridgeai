"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HistoryPanel } from "@/components/HistoryPanel";
import { PackManagerBar } from "@/components/PackManagerBar";
import { useHistory, usePinnedPairs } from "@/hooks/useLocalStore";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";
import { translateText } from "@/lib/api";
import { LANGUAGES, langName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, ClipboardPaste, Copy, FileUp, Star, Trash2 } from "lucide-react";

export function TranslatorPanel() {
  const [from, setFrom] = useState("tr");
  const [to, setTo] = useState("en");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { items, add, toggleFavorite, clear, exportJson } = useHistory();
  const { pins, togglePin, isPinned } = usePinnedPairs();
  const { isPairReady } = useLanguagePacks();

  const doTranslate = useCallback(async () => {
    if (!source.trim() || !isPairReady(from, to)) return;
    setLoading(true);
    try {
      const res = await translateText(source, from, to);
      setTarget(res.translated);
      add({ source, target: res.translated, from, to });
    } catch {
      setTarget("Hata — backend (8000) ve QVAC (8765) çalışıyor mu?");
    } finally {
      setLoading(false);
    }
  }, [source, from, to, add, isPairReady]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        doTranslate();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [doTranslate]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1">
        {pins.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {pins.map((k) => {
              const [f, t] = k.split("-");
              return (
                <button
                  key={k}
                  type="button"
                  className="rounded-full border border-[var(--gb-border)] px-2 py-0.5 text-xs text-[var(--gb-accent)]"
                  onClick={() => {
                    setFrom(f);
                    setTo(t);
                  }}
                >
                  {langName(f)} → {langName(t)}
                </button>
              );
            })}
          </div>
        )}

        <div className="gb-card overflow-hidden">
          <div className="flex items-end gap-2 border-b border-[var(--gb-border)] bg-[var(--gb-surface-2)] p-3">
            <div className="flex-1">
              <label className="text-[0.65rem] font-bold uppercase text-[var(--gb-muted)]">Kaynak</label>
              <select className="gb-select mt-1" value={from} onChange={(e) => setFrom(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={from === "auto"}
              className="mb-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gb-border)]"
              onClick={() => {
                setFrom(to);
                setTo(from);
                setSource(target);
                setTarget(source);
              }}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <label className="text-[0.65rem] font-bold uppercase text-[var(--gb-muted)]">Hedef</label>
              <select className="gb-select mt-1" value={to} onChange={(e) => setTo(e.target.value)}>
                {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={cn("mb-1 rounded-lg border p-2", isPinned(from, to) && "border-amber-400 text-amber-400")}
              onClick={() => togglePin(from, to)}
            >
              <Star className={cn("h-4 w-4", isPinned(from, to) && "fill-amber-400")} />
            </button>
          </div>

          <div className="grid md:grid-cols-2">
            <div className="border-[var(--gb-border)] md:border-r">
              <div className="gb-panel-head">Kaynak</div>
              <textarea
                className="min-h-[220px] w-full resize-none bg-transparent p-4 outline-none"
                placeholder="Metin yazın…"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <div className="flex flex-wrap gap-1 border-t border-[var(--gb-border)] p-2">
                <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = () => setSource(String(r.result));
                    r.readAsText(f);
                  }
                }} />
                <button type="button" className="gb-btn-ghost text-xs" onClick={() => fileRef.current?.click()}>
                  <FileUp className="mr-1 inline h-3 w-3" /> .txt
                </button>
                <button type="button" className="gb-btn-ghost text-xs" onClick={() => navigator.clipboard.readText().then(setSource)}>
                  <ClipboardPaste className="mr-1 inline h-3 w-3" /> Yapıştır
                </button>
                <button type="button" className="gb-btn-ghost text-xs" onClick={() => setSource("")}>
                  <Trash2 className="mr-1 inline h-3 w-3" /> Temizle
                </button>
              </div>
            </div>
            <div>
              <div className="gb-panel-head">Çeviri</div>
              <div className="min-h-[220px] whitespace-pre-wrap p-4">{loading ? "…" : target || "Sonuç"}</div>
              <div className="flex justify-end gap-1 border-t border-[var(--gb-border)] p-2">
                <button type="button" className="gb-btn-ghost text-xs" disabled={!target} onClick={() => navigator.clipboard.writeText(target)}>
                  <Copy className="mr-1 inline h-3 w-3" /> Kopyala
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between border-t border-[var(--gb-border)] bg-[var(--gb-surface-2)] px-4 py-3">
            <span className="text-xs text-[var(--gb-muted)]">Ctrl+Enter</span>
            <button type="button" className="gb-btn-primary" disabled={loading || !source.trim()} onClick={doTranslate}>
              Çevir
            </button>
          </div>
          <PackManagerBar from={from} to={to} />
        </div>
      </div>

      <HistoryPanel
        items={items}
        onToggleFavorite={toggleFavorite}
        onClear={clear}
        onExport={exportJson}
        onSelect={(h) => {
          setFrom(h.from);
          setTo(h.to);
          setSource(h.source);
          setTarget(h.target);
        }}
      />
    </div>
  );
}
