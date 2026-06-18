/**
 * Bergamot (Firefox Translations) language-pair registry.
 * Parley-style direct NMT — no LLM reasoning.
 */
import * as sdk from "@qvac/sdk";

function norm(code) {
  const c = String(code || "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
  if (c === "auto") return "en";
  if (c === "nb" || c === "nn") return "no";
  return c;
}

/** @type {Record<string, unknown>} */
const MODEL_BY_PAIR = {};

for (const [exportName, value] of Object.entries(sdk)) {
  const m = /^BERGAMOT_([A-Z]{2,3})_([A-Z]{2,3})$/.exec(exportName);
  if (!m || !value || typeof value !== "object") continue;
  const from = m[1].toLowerCase();
  const to = m[2].toLowerCase();
  MODEL_BY_PAIR[`${from}-${to}`] = value;
}

export function bergamotPairSupported(from, to) {
  return Boolean(MODEL_BY_PAIR[`${norm(from)}-${norm(to)}`]);
}

export function listBergamotPairs() {
  return Object.keys(MODEL_BY_PAIR);
}

export function resolveBergamotModel(from, to) {
  const f = norm(from);
  const t = norm(to);
  const modelSrc = MODEL_BY_PAIR[`${f}-${t}`];
  if (!modelSrc) return null;
  return { modelSrc, from: f, to: t };
}
