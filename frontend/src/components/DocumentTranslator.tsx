"use client";

import Link from "next/link";
import { useState } from "react";
import { PackManagerBar } from "@/components/PackManagerBar";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";
import { translateText } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { FileText } from "lucide-react";

export function DocumentTranslator() {
  const [from, setFrom] = useState("tr");
  const [to, setTo] = useState("en");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const { isPairReady } = useLanguagePacks();

  const run = async () => {
    if (!source.trim() || !isPairReady(from, to)) return;
    setLoading(true);
    const chunks = source.split(/\n\n+/);
    const out: string[] = [];
    try {
      for (const c of chunks) {
        if (!c.trim()) continue;
        const r = await translateText(c, from, to);
        out.push(r.translated);
        setTarget(out.join("\n\n"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="gb-card overflow-hidden">
        <div className="border-b border-[var(--gb-border)] p-4">
          <h1 className="text-lg font-semibold">Belge çevirisi</h1>
        </div>
        <div className="flex gap-2 border-b border-[var(--gb-border)] p-3">
          <select className="gb-select max-w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)}>{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select>
          <select className="gb-select max-w-[160px]" value={to} onChange={(e) => setTo(e.target.value)}>{LANGUAGES.filter((l) => l.code !== "auto").map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select>
        </div>
        <div className="grid md:grid-cols-2">
          <textarea className="min-h-[280px] border-0 bg-transparent p-4 outline-none md:border-r md:border-[var(--gb-border)]" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Uzun metin…" />
          <div className="min-h-[280px] whitespace-pre-wrap p-4 text-[var(--gb-muted)]">{loading ? "Çevriliyor…" : target || "Sonuç"}</div>
        </div>
        <div className="flex justify-end border-t border-[var(--gb-border)] p-4">
          <button type="button" className="gb-btn-primary" onClick={run} disabled={loading}>Belgeyi çevir</button>
        </div>
        <PackManagerBar from={from} to={to} />
      </div>
      <Link href="/pdf" className="gb-card flex items-center gap-3 p-4 hover:border-[var(--gb-accent)]">
        <FileText className="h-8 w-8 text-[var(--gb-accent)]" />
        <div><div className="font-medium">PDF çevirisi</div><div className="text-sm text-[var(--gb-muted)]">Dosya yükle</div></div>
      </Link>
    </div>
  );
}
