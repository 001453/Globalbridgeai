export const LANGUAGES = [
  { code: "auto", name: "Otomatik algıla" },
  { code: "tr", name: "Türkçe" },
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "ru", name: "Русский" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "fa", name: "فارسی" },
  { code: "hi", name: "हिन्दी" },
] as const;

export const BASE_MODEL_MB = 600;

export function langName(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export function pairKey(from: string, to: string) {
  return `${from === "auto" ? "auto" : from.split("-")[0]}-${to.split("-")[0]}`;
}

export function isBundledPair(from: string, to: string): boolean {
  const f = from === "auto" ? "auto" : from.split("-")[0].toLowerCase();
  const t = to.split("-")[0].toLowerCase();
  if (f === "auto") return t === "en" || t === "tr";
  return (f === "tr" && t === "en") || (f === "en" && t === "tr");
}
