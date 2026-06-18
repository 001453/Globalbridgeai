"""
GlobalBridge AI - Speech-to-Text service using Faster-Whisper.
Supports 99+ languages, VAD, speaker-friendly streaming chunks.
"""

from __future__ import annotations

import asyncio
import logging
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from config import get_settings

logger = logging.getLogger(__name__)

# Lazy-loaded model singleton
_whisper_model: Any = None
_model_lock = asyncio.Lock()


@dataclass
class TranscriptionResult:
    text: str
    language: str
    language_probability: float
    segments: list[dict[str, Any]] = field(default_factory=list)
    duration_ms: float = 0.0
    is_final: bool = True


@dataclass
class STTConfig:
    model_size: str = "large-v3"
    device: str = "auto"
    compute_type: str = "float16"
    beam_size: int = 5
    vad_filter: bool = True
    language: str | None = None  # None = auto-detect


class WhisperSTTService:
    """Faster-Whisper based STT with async wrapper for FastAPI."""

    SUPPORTED_LANGUAGES = [
        "en", "tr", "es", "zh", "ar", "de", "fr", "ja", "ko", "ru",
        "pt", "it", "hi", "nl", "pl", "sv", "uk", "he", "fa", "id",
        "vi", "th", "ms", "cs", "da", "fi", "el", "hu", "no", "ro",
        "sk", "bg", "hr", "sr", "sl", "et", "lv", "lt", "ca", "eu",
        "gl", "af", "sw", "ta", "te", "bn", "ur", "pa", "mr", "gu",
    ]

    def __init__(self, config: STTConfig | None = None):
        settings = get_settings()
        self.config = config or STTConfig(
            model_size=settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
            beam_size=settings.whisper_beam_size,
            vad_filter=settings.whisper_vad_filter,
        )

    async def _get_model(self):
        global _whisper_model
        async with _model_lock:
            if _whisper_model is None:
                logger.info(
                    "Loading Whisper model: %s on %s",
                    self.config.model_size,
                    self.config.device,
                )
                from faster_whisper import WhisperModel

                device = self.config.device
                if device == "auto":
                    try:
                        import torch

                        device = "cuda" if torch.cuda.is_available() else "cpu"
                    except ImportError:
                        device = "cpu"

                compute = self.config.compute_type
                if device == "cpu" and compute == "float16":
                    compute = "int8"

                _whisper_model = WhisperModel(
                    self.config.model_size,
                    device=device,
                    compute_type=compute,
                )
                logger.info("Whisper model loaded successfully")
            return _whisper_model

    async def transcribe(
        self,
        audio: np.ndarray | bytes,
        sample_rate: int = 16000,
        language: str | None = None,
    ) -> TranscriptionResult:
        """
        Transcribe audio chunk.
        Accepts float32 numpy array [-1,1] or int16 PCM bytes.
        """
        if isinstance(audio, bytes):
            audio = np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0

        if len(audio) < sample_rate * 0.1:  # < 100ms
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )

        loop = asyncio.get_event_loop()
        model = await self._get_model()

        def _run():
            start = time.perf_counter()
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp_path = tmp.name
                import wave

                with wave.open(tmp_path, "wb") as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(sample_rate)
                    int16 = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
                    wf.writeframes(int16.tobytes())

            try:
                lang = language or self.config.language
                segments_iter, info = model.transcribe(
                    tmp_path,
                    language=lang,
                    beam_size=self.config.beam_size,
                    vad_filter=self.config.vad_filter,
                    word_timestamps=True,
                    condition_on_previous_text=True,
                )
                segments = []
                texts = []
                for seg in segments_iter:
                    segments.append({
                        "start": seg.start,
                        "end": seg.end,
                        "text": seg.text.strip(),
                    })
                    texts.append(seg.text.strip())

                elapsed = (time.perf_counter() - start) * 1000
                return TranscriptionResult(
                    text=" ".join(texts).strip(),
                    language=info.language or "unknown",
                    language_probability=info.language_probability or 0.0,
                    segments=segments,
                    duration_ms=elapsed,
                )
            finally:
                Path(tmp_path).unlink(missing_ok=True)

        return await loop.run_in_executor(None, _run)

    async def transcribe_stream_chunk(
        self,
        pcm_chunk: bytes,
        sample_rate: int = 16000,
        language: str | None = None,
    ) -> TranscriptionResult:
        """Process a single streaming audio chunk (~500ms)."""
        settings = get_settings()
        min_samples = int(sample_rate * settings.min_audio_duration_ms / 1000)
        audio = np.frombuffer(pcm_chunk, dtype=np.int16).astype(np.float32) / 32768.0

        if len(audio) < min_samples:
            return TranscriptionResult(
                text="",
                language=language or "unknown",
                language_probability=0.0,
                is_final=False,
            )

        return await self.transcribe(audio, sample_rate, language)

    @staticmethod
    def detect_language_hint(text: str) -> str | None:
        """Quick heuristic for code-switching — full detect via Whisper."""
        if not text:
            return None
        # Unicode range heuristics
        for ch in text:
            if "\u4e00" <= ch <= "\u9fff":
                return "zh"
            if "\u0600" <= ch <= "\u06ff":
                return "ar"
            if "\u3040" <= ch <= "\u30ff":
                return "ja"
            if "\uac00" <= ch <= "\ud7af":
                return "ko"
        return None


# Module-level singleton
stt_service = WhisperSTTService()
