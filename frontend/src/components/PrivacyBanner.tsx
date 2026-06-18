"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/types";
import { Shield, ShieldAlert, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyStatus {
  mode: string;
  local_processing_only: boolean;
  translation_provider: string;
  qvac_available: boolean;
  cloud_allowed: boolean;
  data_egress_points: string[];
  guarantees: string[];
}

export function PrivacyBanner() {
  const [status, setStatus] = useState<PrivacyStatus | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/privacy/status`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/v1/privacy/status`)
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => null);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const isSovereign = status.mode === "sovereign" || status.local_processing_only;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        isSovereign
          ? "border-green-200 bg-green-50 text-green-900"
          : status.mode === "cloud"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-blue-200 bg-blue-50 text-blue-900"
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {isSovereign ? (
          <Shield className="h-4 w-4" />
        ) : status.mode === "cloud" ? (
          <Cloud className="h-4 w-4" />
        ) : (
          <ShieldAlert className="h-4 w-4" />
        )}
        {isSovereign
          ? "Sovereign Mode — Veriler cihazınızda kalır (QVAC)"
          : status.mode === "cloud"
            ? "Cloud Mode — Çeviri buluta gider"
            : "Hybrid Mode — QVAC öncelikli"}
      </div>
      <div className="mt-1 text-xs opacity-80">
        Çeviri: {status.translation_provider}
        {status.qvac_available ? " · QVAC aktif" : " · QVAC kapalı — qvac-service başlatın"}
      </div>
      {status.guarantees.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs opacity-75">
          {status.guarantees.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      )}
      {status.data_egress_points.length > 0 && (
        <ul className="mt-1 list-inside list-disc text-xs text-amber-700">
          {status.data_egress_points.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
