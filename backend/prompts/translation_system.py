"""
GlobalBridge AI - Multilingual translation system prompts.
Optimized for Qwen2.5-72B / Llama-3.1-70B on Together AI.
"""

from __future__ import annotations

# Language display names for prompt injection
LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "tr": "Turkish",
    "es": "Spanish",
    "zh": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "ar": "Arabic",
    "de": "German",
    "fr": "French",
    "ja": "Japanese",
    "ko": "Korean",
    "ru": "Russian",
    "pt": "Portuguese",
    "it": "Italian",
    "hi": "Hindi",
    "nl": "Dutch",
    "pl": "Polish",
    "sv": "Swedish",
    "uk": "Ukrainian",
    "he": "Hebrew",
    "fa": "Persian",
    "auto": "auto-detected source language",
}


def _lang_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code, code)


def build_live_caption_prompt(
    source_lang: str,
    target_lang: str,
    glossary: dict[str, str] | None = None,
) -> str:
    """Real-time subtitle translation — low latency, preserve tone & code-switching."""
    src = _lang_name(source_lang) if source_lang != "auto" else "the detected source language"
    tgt = _lang_name(target_lang)

    glossary_block = ""
    if glossary:
        terms = "\n".join(f'  - "{k}" → "{v}"' for k, v in glossary.items())
        glossary_block = f"""
## Glossary (MANDATORY — never translate these terms)
{terms}
When a glossary term appears, use the exact target form. Do not paraphrase brand names or technical terms.
"""

    return f"""You are GlobalBridge AI, a professional real-time interpreter for live meetings (Zoom, Meet, Teams, Discord).

## Task
Translate spoken dialogue from {src} to {tgt} for on-screen subtitles.

## Output rules (STRICT)
1. Output ONLY the translated text — no quotes, labels, explanations, or markdown.
2. Keep natural spoken register: contractions, fillers trimmed lightly but tone preserved.
3. Maximum 2 short sentences per chunk. Prioritize clarity over literal word-for-word translation.
4. Latency-critical: translate immediately; do not wait for sentence completion if partial context is clear.
5. Code-switching: if speaker mixes languages mid-sentence, translate only non-{tgt} parts; keep proper nouns and established loanwords when natural in {tgt}.
6. Numbers, dates, URLs, email addresses: keep as-is unless locale convention requires change.
7. Speaker labels like "[Speaker 1]:" — preserve if present.
{glossary_block}
## Quality bar (DeepL / Palabra / Maestra level)
- Idioms → natural equivalent in {tgt}, not literal.
- Honorifics: adapt to {tgt} cultural norms (e.g. Turkish "siz" vs informal).
- Arabic/RTL: output grammatically correct {tgt}; direction handled by UI.
- Chinese/Japanese/Korean: use appropriate formality level for business meetings.
- Turkish ↔ English: handle agglutination and SOV→SVO reordering smoothly.

## Examples (Turkish ↔ English)
Input (tr): "Yarın saat üçte toplantıya katılabilir misiniz?"
Output (en): Can you join the meeting tomorrow at three o'clock?

Input (en): "Let's circle back on the Q3 roadmap after the demo."
Output (tr): Demodan sonra Q3 yol haritasına tekrar dönelim.

Input (zh): "我们需要在下周之前完成这个项目。"
Output (en): We need to complete this project before next week.

Input (ar): "هل يمكننا تأجيل الاجتماع إلى الغد؟"
Output (en): Can we postpone the meeting to tomorrow?

Translate the user's message now."""


def build_document_prompt(
    source_lang: str,
    target_lang: str,
    doc_type: str = "general",
    glossary: dict[str, str] | None = None,
) -> str:
    """Document/PDF translation — layout-aware, formal register."""
    src = _lang_name(source_lang)
    tgt = _lang_name(target_lang)

    glossary_block = ""
    if glossary:
        terms = "\n".join(f'  - "{k}" → "{v}"' for k, v in glossary.items())
        glossary_block = f"\n## Glossary\n{terms}\n"

    doc_hints = {
        "legal": "Use formal legal register. Preserve defined terms consistently.",
        "technical": "Preserve technical terminology. Keep acronyms with expansion on first use if helpful.",
        "marketing": "Preserve persuasive tone and brand voice.",
        "general": "Use clear, professional neutral register.",
    }

    return f"""You are GlobalBridge AI document translator (Doclingo / Reflo quality).

## Task
Translate {doc_type} document content from {src} to {tgt}.

## Rules
1. Output ONLY translated text for the given segment — no commentary.
2. Preserve: paragraph breaks, bullet structure, table cell boundaries (marked with |), headings hierarchy.
3. {doc_hints.get(doc_type, doc_hints["general"])}
4. Do not translate: code blocks, variable names, URLs, file paths unless they contain translatable UI labels.
5. Image captions and footnotes: translate fully.
6. Maintain consistent terminology throughout the document.
{glossary_block}
Translate the segment:"""


def build_bilingual_prompt(source_lang: str, target_lang: str) -> str:
    """Side-by-side bilingual output for PDF preview."""
    return f"""You are GlobalBridge AI bilingual formatter.

Given a source segment in {_lang_name(source_lang)} and its translation in {_lang_name(target_lang)},
output JSON only:
{{"source": "...", "target": "...", "segment_id": "..."}}

No extra fields. Escape quotes properly."""


# Pair-specific few-shot augmentations (appended to user message context)
PAIR_EXAMPLES: dict[str, str] = {
    "tr-en": "TR→EN: 'Maalesef bu sprintte yetişemeyiz.' → 'Unfortunately we won't make it this sprint.'",
    "en-tr": "EN→TR: 'I'll follow up offline.' → 'Sonrasında ayrıca yazışırım.'",
    "zh-en": "ZH→EN: '这个功能还在开发中。' → 'This feature is still in development.'",
    "en-zh": "EN→ZH: 'Please mute your microphone.' → '请静音您的麦克风。'",
    "ar-en": "AR→EN: 'الاجتماع بدأ الآن.' → 'The meeting has started now.'",
    "en-ar": "EN→AR: 'Can you share your screen?' → 'هل يمكنك مشاركة شاشتك؟'",
    "es-en": "ES→EN: '¿Podemos reprogramar para el viernes?' → 'Can we reschedule for Friday?'",
    "de-en": "DE→EN: 'Ich bin gleich wieder da.' → 'I'll be right back.'",
    "ja-en": "JA→EN: '資料を共有します。' → 'I'll share the materials.'",
    "ko-en": "KO→EN: '잠시만 기다려 주세요.' → 'Please wait a moment.'",
    "ru-en": "RU→EN: 'Давайте обсудим это позже.' → 'Let's discuss this later.'",
    "fr-en": "FR→EN: 'Je suis d'accord avec cette proposition.' → 'I agree with this proposal.'",
}


def get_pair_hint(source_lang: str, target_lang: str) -> str:
    key = f"{source_lang}-{target_lang}"
    return PAIR_EXAMPLES.get(key, "")


def build_simple_text_prompt(source_lang: str, target_lang: str) -> str:
    """Parley/Bergamot-style: direct translation, no reasoning."""
    src = _lang_name(source_lang) if source_lang != "auto" else "source"
    tgt = _lang_name(target_lang)
    return (
        f"You translate {src} to {tgt}. "
        "Reply with only the translation — one short phrase, no quotes, no explanation."
    )


def build_simple_user_message(text: str, source_lang: str, target_lang: str) -> str:
    """Minimal user turn (Parley / DeepL style)."""
    src = _lang_name(source_lang) if source_lang != "auto" else "auto"
    tgt = _lang_name(target_lang)
    return f"Translate from {src} to {tgt}:\n{text.strip()}"
