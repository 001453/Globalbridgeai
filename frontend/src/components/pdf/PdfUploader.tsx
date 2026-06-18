"use client";

import { useCallback, useState } from "react";
import { getPdfJob, pdfDownloadUrl, uploadPdf, bilingualPreviewUrl } from "@/lib/api";
import { LANGUAGES } from "@/lib/types";
import { FileText, Loader2, Download, Eye } from "lucide-react";

export function PdfUploader() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [jobs, setJobs] = useState<
    Array<{ job_id: string; filename: string; status: string; progress: number }>
  >([]);
  const [uploading, setUploading] = useState(false);

  const pollJob = useCallback(async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const job = await getPdfJob(jobId);
        setJobs((prev) =>
          prev.map((j) =>
            j.job_id === jobId
              ? { ...j, status: job.status, progress: job.progress ?? 0 }
              : j
          )
        );
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const job = await uploadPdf(file, sourceLang, targetLang);
        setJobs((prev) => [
          ...prev,
          { job_id: job.job_id, filename: job.filename, status: job.status, progress: 0 },
        ]);
        pollJob(job.job_id);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-bridge-900">PDF & Dosya Çeviri</h1>
        <p className="text-sm text-slate-500">
          PDF, DOCX — layout koruma, OCR, bilingual önizleme, batch
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Kaynak dil</label>
          <select
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Hedef dil</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {LANGUAGES.filter((l) => l.code !== "auto").map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 transition hover:border-bridge-500 hover:bg-bridge-50">
        <FileText className="mb-3 h-10 w-10 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">
          {uploading ? "Yükleniyor..." : "PDF / DOCX sürükle veya tıkla (batch destekli)"}
        </span>
        <input
          type="file"
          accept=".pdf,.docx,.pptx"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
        />
      </label>

      {jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.job_id}
              className="flex items-center justify-between rounded-lg border bg-white p-4"
            >
              <div>
                <div className="font-medium">{job.filename}</div>
                <div className="text-sm text-slate-500">
                  {job.status}
                  {job.status === "translating" && ` — ${Math.round(job.progress * 100)}%`}
                </div>
                {job.status !== "completed" && job.status !== "failed" && (
                  <Loader2 className="mt-1 h-4 w-4 animate-spin text-bridge-500" />
                )}
              </div>
              {job.status === "completed" && (
                <div className="flex gap-2">
                  <a
                    href={bilingualPreviewUrl(job.job_id)}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" /> Bilingual
                  </a>
                  <a
                    href={pdfDownloadUrl(job.job_id)}
                    className="flex items-center gap-1 rounded-lg bg-bridge-600 px-3 py-1.5 text-sm text-white hover:bg-bridge-500"
                  >
                    <Download className="h-4 w-4" /> İndir
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
