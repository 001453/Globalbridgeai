"use client";

import { useCallback, useEffect, useState } from "react";
import { downloadLanguagePack, fetchInstalledPacks, fetchPackStatus } from "@/lib/api";
import { isBundledPair, pairKey } from "@/lib/languages";

const READY_KEY = "gb-packs-ready-v1";

function loadReady(): Record<string, boolean> {
  const base: Record<string, boolean> = { "tr-en": true, "en-tr": true, "auto-en": true, "auto-tr": true };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(READY_KEY) || "{}") };
  } catch {
    return base;
  }
}

export function useLanguagePacks() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [qvacOnline, setQvacOnline] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [state, setState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setState(loadReady());
    fetchPackStatus("tr", "en")
      .then((s) => {
        setQvacOnline(s.qvac_online);
        setModelLoaded(Boolean(s.model_loaded));
      })
      .catch(() => {});
    fetchInstalledPacks()
      .then((d) => {
        const next = loadReady();
        for (const p of d.installed ?? []) next[pairKey(p.from, p.to)] = true;
        localStorage.setItem(READY_KEY, JSON.stringify(next));
        setState(next);
      })
      .catch(() => {});
  }, []);

  const isPairReady = useCallback(
    (from: string, to: string) => isBundledPair(from, to) || Boolean(state[pairKey(from, to)]),
    [state]
  );

  const isBundled = useCallback((from: string, to: string) => isBundledPair(from, to), []);

  const downloadPair = useCallback(async (from: string, to: string) => {
    if (isBundledPair(from, to)) return true;
    setDownloading(true);
    setProgress(0);
    try {
      const r = await downloadLanguagePack(from, to, setProgress);
      if (r.ready) {
        const next = loadReady();
        next[pairKey(from, to)] = true;
        localStorage.setItem(READY_KEY, JSON.stringify(next));
        setState(next);
        setModelLoaded(true);
      }
      return r.ready;
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }, []);

  const refreshStatus = useCallback(async (from: string, to: string) => {
    const s = await fetchPackStatus(from, to);
    setQvacOnline(s.qvac_online);
    setModelLoaded(Boolean(s.model_loaded));
    return s;
  }, []);

  return { downloading, progress, qvacOnline, modelLoaded, isPairReady, isBundled, downloadPair, refreshStatus };
}
