"use client";

import { PackManager } from "@/components/PackManager";
import { useLanguagePacks } from "@/hooks/useLanguagePacks";

export function PackManagerBar({ from, to }: { from: string; to: string }) {
  const packs = useLanguagePacks();
  return (
    <PackManager
      from={from}
      to={to}
      ready={packs.isPairReady(from, to)}
      bundled={packs.isBundled(from, to)}
      modelLoaded={packs.modelLoaded}
      qvacOnline={packs.qvacOnline}
      downloading={packs.downloading}
      progress={packs.progress}
      onDownload={() => packs.downloadPair(from, to)}
      onRefresh={() => packs.refreshStatus(from, to)}
    />
  );
}
