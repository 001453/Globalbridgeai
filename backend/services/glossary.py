"""Glossary / term dictionary management."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from pathlib import Path

from config import DATA_DIR


@dataclass
class GlossaryTerm:
    id: str
    source: str
    target: str
    source_lang: str
    target_lang: str
    case_sensitive: bool = False
    category: str = "general"


class GlossaryService:
    def __init__(self):
        self._path = DATA_DIR / "glossary.json"
        self._terms: dict[str, GlossaryTerm] = {}
        self._load()

    def _load(self) -> None:
        if self._path.exists():
            data = json.loads(self._path.read_text(encoding="utf-8"))
            for item in data:
                t = GlossaryTerm(**item)
                self._terms[t.id] = t

    def _save(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            json.dumps([t.__dict__ for t in self._terms.values()], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def list_terms(self, source_lang: str | None = None, target_lang: str | None = None) -> list[GlossaryTerm]:
        terms = list(self._terms.values())
        if source_lang:
            terms = [t for t in terms if t.source_lang == source_lang]
        if target_lang:
            terms = [t for t in terms if t.target_lang == target_lang]
        return terms

    def add_term(self, source: str, target: str, source_lang: str, target_lang: str, **kwargs) -> GlossaryTerm:
        term = GlossaryTerm(
            id=str(uuid.uuid4()),
            source=source,
            target=target,
            source_lang=source_lang,
            target_lang=target_lang,
            **kwargs,
        )
        self._terms[term.id] = term
        self._save()
        return term

    def delete_term(self, term_id: str) -> bool:
        if term_id in self._terms:
            del self._terms[term_id]
            self._save()
            return True
        return False

    def to_dict(self, source_lang: str, target_lang: str) -> dict[str, str]:
        return {
            t.source: t.target
            for t in self._terms.values()
            if t.source_lang == source_lang and t.target_lang == target_lang
        }


glossary_service = GlossaryService()
