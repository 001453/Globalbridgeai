"""
GlobalBridge AI - PDF/DOCX/PPTX translation with layout preservation.
OCR for scanned PDFs, bilingual preview, batch processing.
"""

from __future__ import annotations

import asyncio
import json
import logging
import shutil
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

import fitz  # PyMuPDF

from config import OUTPUT_DIR, UPLOAD_DIR, get_settings
from services.translation import TranslationService, translation_service

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    PENDING = "pending"
    EXTRACTING = "extracting"
    TRANSLATING = "translating"
    RENDERING = "rendering"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TextBlock:
    id: str
    text: str
    page: int
    bbox: tuple[float, float, float, float]  # x0, y0, x1, y1
    font_size: float = 12.0
    font_name: str = "helv"
    is_heading: bool = False
    block_type: str = "text"  # text | table_cell | caption


@dataclass
class TranslationJob:
    id: str
    filename: str
    source_path: Path
    source_lang: str
    target_lang: str
    status: JobStatus = JobStatus.PENDING
    progress: float = 0.0
    blocks: list[TextBlock] = field(default_factory=list)
    translated_blocks: list[dict[str, Any]] = field(default_factory=list)
    output_path: Path | None = None
    bilingual_path: Path | None = None
    error: str | None = None
    doc_type: str = "general"


class PDFTranslateService:
    """Doclingo-quality PDF translation using PyMuPDF block extraction."""

    def __init__(self, translator: TranslationService | None = None):
        self.translator = translator or translation_service
        self.settings = get_settings()
        self._jobs: dict[str, TranslationJob] = {}

    def get_job(self, job_id: str) -> TranslationJob | None:
        return self._jobs.get(job_id)

    async def create_job(
        self,
        file_path: Path,
        source_lang: str,
        target_lang: str,
        doc_type: str = "general",
    ) -> TranslationJob:
        job_id = str(uuid.uuid4())
        job = TranslationJob(
            id=job_id,
            filename=file_path.name,
            source_path=file_path,
            source_lang=source_lang,
            target_lang=target_lang,
            doc_type=doc_type,
        )
        self._jobs[job_id] = job
        return job

    def _extract_pdf_blocks(self, pdf_path: Path) -> list[TextBlock]:
        blocks: list[TextBlock] = []
        doc = fitz.open(pdf_path)

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

            for block in page_dict.get("blocks", []):
                if block.get("type") != 0:  # text only
                    continue

                for line in block.get("lines", []):
                    line_text = ""
                    max_size = 12.0
                    font_name = "helv"

                    for span in line.get("spans", []):
                        line_text += span.get("text", "")
                        max_size = max(max_size, span.get("size", 12))
                        font_name = span.get("font", font_name)

                    line_text = line_text.strip()
                    if not line_text:
                        continue

                    bbox = tuple(line.get("bbox", block.get("bbox", (0, 0, 0, 0))))
                    blocks.append(TextBlock(
                        id=str(uuid.uuid4()),
                        text=line_text,
                        page=page_num,
                        bbox=bbox,  # type: ignore
                        font_size=max_size,
                        font_name=font_name,
                        is_heading=max_size > 14,
                    ))

        doc.close()

        # OCR fallback for scanned pages with no text
        if not blocks:
            blocks = self._ocr_pdf(pdf_path)

        return blocks

    def _ocr_pdf(self, pdf_path: Path) -> list[TextBlock]:
        """OCR scanned PDF pages via pytesseract."""
        blocks: list[TextBlock] = []
        try:
            import pytesseract
            from pdf2image import convert_from_path
            from PIL import Image

            images = convert_from_path(str(pdf_path), dpi=200)
            for page_num, img in enumerate(images):
                data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
                n = len(data["text"])
                for i in range(n):
                    text = (data["text"][i] or "").strip()
                    if not text or int(data["conf"][i]) < 30:
                        continue
                    x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
                    blocks.append(TextBlock(
                        id=str(uuid.uuid4()),
                        text=text,
                        page=page_num,
                        bbox=(x, y, x + w, y + h),
                        block_type="ocr",
                    ))
        except Exception as e:
            logger.warning("OCR unavailable: %s", e)
        return blocks

    def _extract_docx_blocks(self, docx_path: Path) -> list[TextBlock]:
        from docx import Document

        blocks: list[TextBlock] = []
        doc = Document(docx_path)
        for i, para in enumerate(doc.paragraphs):
            text = para.text.strip()
            if text:
                blocks.append(TextBlock(
                    id=str(uuid.uuid4()),
                    text=text,
                    page=0,
                    bbox=(0, i * 20, 500, (i + 1) * 20),
                    is_heading=para.style.name.startswith("Heading"),
                ))
        return blocks

    async def _translate_blocks(self, job: TranslationJob) -> None:
        job.status = JobStatus.TRANSLATING
        total = len(job.blocks)
        batch_size = 10

        for i in range(0, total, batch_size):
            batch = job.blocks[i : i + batch_size]
            segments = [b.text for b in batch]
            results = await self.translator.translate_batch(
                segments, job.source_lang, job.target_lang, concurrency=5
            )

            for block, result in zip(batch, results):
                job.translated_blocks.append({
                    "id": block.id,
                    "source": block.text,
                    "target": result.text,
                    "page": block.page,
                    "bbox": block.bbox,
                    "font_size": block.font_size,
                    "font_name": block.font_name,
                })

            job.progress = min(0.9, (i + len(batch)) / total * 0.85 + 0.1)

    def _render_translated_pdf(self, job: TranslationJob) -> Path:
        """Create new PDF with translated text at original positions."""
        job.status = JobStatus.RENDERING
        src = fitz.open(job.source_path)
        out = fitz.open()

        pages_blocks: dict[int, list[dict]] = {}
        for tb in job.translated_blocks:
            pages_blocks.setdefault(tb["page"], []).append(tb)

        for page_num in range(len(src)):
            src_page = src[page_num]
            new_page = out.new_page(width=src_page.rect.width, height=src_page.rect.height)
            new_page.show_pdf_page(new_page.rect, src, page_num)

            # White-out original text regions and overlay translation
            for tb in pages_blocks.get(page_num, []):
                rect = fitz.Rect(tb["bbox"])
                new_page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
                font_size = min(tb["font_size"], 14)
                new_page.insert_textbox(
                    rect,
                    tb["target"],
                    fontsize=font_size,
                    fontname="helv",
                    align=fitz.TEXT_ALIGN_LEFT,
                )

        output_path = OUTPUT_DIR / f"{job.id}_translated.pdf"
        out.save(str(output_path))
        out.close()
        src.close()
        return output_path

    def _render_bilingual_html(self, job: TranslationJob) -> Path:
        """Side-by-side bilingual preview HTML."""
        rows = []
        for tb in job.translated_blocks:
            rows.append(
                f'<tr><td class="source">{_esc(tb["source"])}</td>'
                f'<td class="target">{_esc(tb["target"])}</td></tr>'
            )

        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{_esc(job.filename)} — Bilingual</title>
<style>
  body {{ font-family: 'Segoe UI', 'Noto Sans', sans-serif; margin: 24px; }}
  table {{ width: 100%; border-collapse: collapse; }}
  td {{ padding: 12px; border-bottom: 1px solid #e5e5e5; vertical-align: top; width: 50%; }}
  .source {{ background: #f8fafc; color: #334155; }}
  .target {{ background: #f0fdf4; color: #166534; }}
  h1 {{ font-size: 1.25rem; }}
</style></head><body>
<h1>{_esc(job.filename)} — {job.source_lang} → {job.target_lang}</h1>
<table><thead><tr><th>Source</th><th>Translation</th></tr></thead>
<tbody>{"".join(rows)}</tbody></table></body></html>"""

        path = OUTPUT_DIR / f"{job.id}_bilingual.html"
        path.write_text(html, encoding="utf-8")
        return path

    async def process_job(self, job: TranslationJob) -> TranslationJob:
        try:
            job.status = JobStatus.EXTRACTING
            suffix = job.source_path.suffix.lower()

            if suffix == ".pdf":
                job.blocks = await asyncio.get_event_loop().run_in_executor(
                    None, self._extract_pdf_blocks, job.source_path
                )
            elif suffix == ".docx":
                job.blocks = await asyncio.get_event_loop().run_in_executor(
                    None, self._extract_docx_blocks, job.source_path
                )
            else:
                raise ValueError(f"Unsupported format: {suffix}")

            if not job.blocks:
                raise ValueError("No extractable text found in document")

            job.progress = 0.1
            await self._translate_blocks(job)

            if suffix == ".pdf":
                job.output_path = await asyncio.get_event_loop().run_in_executor(
                    None, self._render_translated_pdf, job
                )
            else:
                # DOCX: export JSON for now; full layout DOCX in v2
                out_json = OUTPUT_DIR / f"{job.id}_translated.json"
                out_json.write_text(
                    json.dumps(job.translated_blocks, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                job.output_path = out_json

            job.bilingual_path = await asyncio.get_event_loop().run_in_executor(
                None, self._render_bilingual_html, job
            )
            job.status = JobStatus.COMPLETED
            job.progress = 1.0

        except Exception as e:
            logger.exception("PDF job failed: %s", job.id)
            job.status = JobStatus.FAILED
            job.error = str(e)

        return job

    async def process_batch(
        self,
        files: list[Path],
        source_lang: str,
        target_lang: str,
    ) -> list[TranslationJob]:
        jobs = [await self.create_job(f, source_lang, target_lang) for f in files]
        await asyncio.gather(*[self.process_job(j) for j in jobs])
        return jobs


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


pdf_service = PDFTranslateService()
