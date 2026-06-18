"use client";

import { useCallback, useEffect, useState } from "react";

export type MicDevice = { deviceId: string; label: string };

export function useMicDevices() {
  const [devices, setDevices] = useState<MicDevice[]>([]);

  const refresh = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        list
          .filter((d) => d.kind === "audioinput")
          .map((d) => ({ deviceId: d.deviceId, label: d.label || "Mikrofon" }))
      );
    } catch {
      setDevices([]);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await refresh();
    } catch {
      /* izin reddedildi */
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    navigator.mediaDevices?.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices?.removeEventListener("devicechange", refresh);
  }, [refresh]);

  return { devices, refresh, requestPermission };
}
