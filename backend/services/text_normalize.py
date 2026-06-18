"""Strip LLM chain-of-thought and return plain translation only."""

from __future__ import annotations

import re

_TAG = "think"
_OPEN = "<" + _TAG + ">"
_CLOSE = "</" + _TAG + ">"
_THINK_BLOCK = re.compile(re.escape(_OPEN) + r".*?" + re.escape(_CLOSE), re.DOTALL | re.IGNORECASE)
_THINK_OPEN = re.compile(re.escape(_OPEN) + r".*", re.DOTALL | re.IGNORECASE)
_PREFIXES = ("output:", "translation:", "çeviri:", "answer:", "final:", "result:")


def clean_translation_output(text: str, *, max_chars: int | None = None) -> str:
    if not text:
        return ""

    out = text.strip()
    out = _THINK_BLOCK.sub("", out)
    out = _THINK_OPEN.sub("", out)
    out = out.strip()

    if out.startswith("```"):
        lines = out.split("\n")
        if len(lines) >= 2 and lines[-1].strip() == "```":
            out = "\n".join(lines[1:-1]).strip()
        else:
            out = "\n".join(lines[1:]).strip()

    lower = out.lower()
    for prefix in _PREFIXES:
        if lower.startswith(prefix):
            out = out[len(prefix) :].strip()
            break

    if len(out) >= 2 and out[0] in "\"'" and out[-1] == out[0]:
        out = out[1:-1].strip()

    if "\n\n" in out:
        parts = [p.strip() for p in out.split("\n\n") if p.strip()]
        if parts and len(parts[0]) < 200 and not parts[0].lower().startswith(
            ("ok", "let ", "the user", "i need", "so the")
        ):
            out = parts[0]
        elif parts:
            candidates = [p for p in parts if len(p) < 120 and "think" not in p.lower()]
            if candidates:
                out = min(candidates, key=len)

    if max_chars and len(out) > max_chars:
        first_line = out.split("\n", 1)[0].strip()
        if first_line:
            out = first_line

    return out.strip()
