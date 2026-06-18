"use client";

import { useCallback, useEffect, useState } from "react";

export type MicSettings = {
  deviceId: string;
  fontSize: number;
  bidirectional: boolean;
};

const KEY = "gb-mic-settings-v1";

const DEFAULTS: MicSettings = {
  deviceId: "",
  fontSize: 32,
  bidirectional: true,
};

export function useMicSettings() {
  const [settings, setSettings] = useState<MicSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<MicSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, update, ready };
}
