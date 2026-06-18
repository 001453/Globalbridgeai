"use client";

import { useState } from "react";
import { PackManagerBar } from "@/components/PackManagerBar";
import { useConversation } from "@/hooks/useLocalStore";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";
import { translateText } from "@/lib/api";
import { LANGUAGES, langName } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { Send, Trash2 } from "lucide-react";

export function ConversationMode() {
  const [langA, setLangA] = useState("tr");
  const [langB, setLangB] = useState("en");
  const [speaker, setSpeaker] = useState<"a" | "b">("a");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { messages, push, clear } = useConversation();
  const { isPairReady } = useLanguagePacks();

  const send = async () => {
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
      setSpeaker((s) => (s === "a" ? "b" : "a"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gb-card overflow-hidden">
      <div className="border-b border-[var(--gb-border)] p-4">
        <h1 className="text-lg font-semibold">Konuşma</h1>
        <p className="text-sm text-[var(--gb-muted)]">Parley tarzı iki yönlü sohbet — mikrofon yok.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--gb-border)] p-3">
        <select className="gb-select max-w-[140px]" value={langA} onChange={(e) => setLangA(e.target.value)}>
          {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
        <select className="gb-select max-w-[140px]" value={langB} onChange={(e) => setLangB(e.target.value)}>
          {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
        <button type="button" className={cn("rounded-full border px-3 py-1 text-sm", speaker === "a" && "border-[var(--gb-accent)] text-[var(--gb-accent)]")} onClick={() => setSpeaker("a")}>{langName(langA)}</button>
        <button type="button" className={cn("rounded-full border px-3 py-1 text-sm", speaker === "b" && "border-[var(--gb-accent)] text-[var(--gb-accent)]")} onClick={() => setSpeaker("b")}>{langName(langB)}</button>
      </div>
      <div className="max-h-80 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("mb-2 rounded-lg border p-3 text-sm", m.speaker === "b" && "ml-6 border-[var(--gb-accent)]")}>
            <p>{m.source}</p>
            <p className="mt-1 text-[var(--gb-accent)]">{m.target}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--gb-border)] p-4">
        <textarea className="gb-textarea min-h-[72px]" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="gb-btn-ghost border border-[var(--gb-border)]" onClick={clear}><Trash2 className="h-4 w-4" /></button>
          <button type="button" className="gb-btn-primary" onClick={send} disabled={loading}><Send className="mr-1 inline h-4 w-4" />Gönder</button>
        </div>
      </div>
      <PackManagerBar from={langA} to={langB} />
    </div>
  );
}
