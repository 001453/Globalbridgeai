"""Bundled TR↔EN + optional per-pair installs."""

from __future__ import annotations

import json
from pathlib import Path

from config import DATA_DIR

BUNDLED_PAIRS: frozenset[tuple[str, str]] = frozenset({("tr", "en"), ("en", "tr")})


def _norm(code: str) -> str:
    c = (code or "").strip().lower()
    return "auto" if c == "auto" else c.split("-")[0]


def pair_key(from_lang: str, to_lang: str) -> str:
    return f"{_norm(from_lang)}-{_norm(to_lang)}"


def is_bundled_pair(from_lang: str, to_lang: str) -> bool:
    f, t = _norm(from_lang), _norm(to_lang)
    if f == "auto":
        return t in ("en", "tr")
    return (f, t) in BUNDLED_PAIRS


class PackService:
    def __init__(self) -> None:
        self._path = DATA_DIR / "installed_packs.json"
        self._installed: set[str] = set()
        self._load()

    def _load(self) -> None:
        if self._path.exists():
            try:
                data = json.loads(self._path.read_text(encoding="utf-8"))
                self._installed = set(data.get("pairs", []))
            except Exception:
                self._installed = set()

    def _save(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps({"pairs": sorted(self._installed)}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def list_installed(self) -> list[dict[str, str]]:
        out = []
        for key in sorted(self._installed):
            parts = key.split("-", 1)
            if len(parts) == 2:
                out.append({"from": parts[0], "to": parts[1], "key": key})
        return out

    def is_installed(self, from_lang: str, to_lang: str) -> bool:
        return pair_key(from_lang, to_lang) in self._installed

    def mark_installed(self, from_lang: str, to_lang: str) -> None:
        self._installed.add(pair_key(from_lang, to_lang))
        self._save()

    def status(self, from_lang: str, to_lang: str, *, model_loaded: bool, qvac_online: bool) -> dict:
        bundled = is_bundled_pair(from_lang, to_lang)
        installed = self.is_installed(from_lang, to_lang)
        return {
            "from": _norm(from_lang) if _norm(from_lang) != "auto" else from_lang,
            "to": _norm(to_lang),
            "bundled": bundled,
            "installed": installed,
            "ready": bundled or installed,
            "needs_download": not bundled and not installed,
            "model_loaded": model_loaded,
            "qvac_online": qvac_online,
            "model_mb": 600,
            "free": True,
            "data_egress": False,
            "local": True,
        }


pack_service = PackService()
