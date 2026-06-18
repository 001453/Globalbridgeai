# GlobalBridge AI — Tam Çok Dilli Köprü

100+ dil destekleyen gerçek zamanlı çeviri, altyazı ve PDF çeviri sistemi.  
Palabra, Maestra, Talo, Wordly, Otter ve Doclingo özelliklerini birleştirir.

## Özellikler

| Modül | Özellikler |
|-------|-----------|
| **Live Caption** | Zoom/Meet/Teams/Discord, Whisper STT, ≤2sn gecikme, çift yönlü çeviri, overlay |
| **PDF Çeviri** | Layout koruma, OCR, bilingual önizleme, batch |
| **Toplantı Zekası** | Özet, aksiyon maddeleri, konu tespiti, speaker ayrımı |
| **Glossary** | Şirket/teknik terim sözlüğü |
| **Gizlilik** | QVAC local AI, Sovereign mode, zero egress, otomatik veri silme |

## QVAC — Veriler Cihazda Kalır

[QVAC](https://qvac.tether.io/) (Tether) tamamen **lokal, merkeziyetsiz AI** sağlar. GlobalBridge AI ile entegre edildi:

| Bileşen | Sovereign Mode | Cloud Mode |
|---------|----------------|------------|
| STT (ses) | Faster-Whisper lokal | Lokal |
| Çeviri | QVAC `@qvac/sdk` lokal | Together AI (bulut) |
| PDF | QVAC + PyMuPDF lokal | Together AI |
| Özet | QVAC lokal | Together AI |

**Sovereign Mode** (`LOCAL_PROCESSING_ONLY=true`): Hiçbir konuşma, transkript veya dosya buluta gitmez.

```
Mikrofon → localhost:8000 (FastAPI) → localhost:8765 (QVAC Bridge) → GPU/RAM
                                              ↑
                                    Veri burada kalır, dışarı çıkmaz
```

QVAC bridge başlatma:
```bash
cd qvac-service
npm install
npm start
# http://127.0.0.1:8765/health
```

Dokümantasyon: [docs.qvac.tether.io](https://docs.qvac.tether.io/sdk/getting-started/)

## Klasör Yapısı

```
globalbridge-ai/
├── backend/
│   ├── main.py                 # FastAPI entry
│   ├── config.py               # Ayarlar
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── api/
│   │   ├── websocket.py        # Gerçek zamanlı pipeline
│   │   ├── pdf.py              # PDF REST API
│   │   └── translate.py        # Glossary + summary
│   ├── services/
│   │   ├── stt.py              # Faster-Whisper
│   │   ├── translation.py      # QVAC local + Together AI routing
│   │   ├── qvac_client.py      # QVAC bridge client
│   │   ├── privacy.py          # Sovereign / hybrid / cloud
│   │   ├── overlay.py          # Altyazı state
│   │   ├── pdf_translate.py    # PDF/DOCX çeviri
│   │   ├── glossary.py
│   │   └── summary.py
│   ├── prompts/
│   │   ├── translation_system.py  # ⭐ Kritik system prompt'lar
│   │   └── summary_system.py
│   └── database/
├── frontend/                   # Next.js 15
│   └── src/
│       ├── components/
│       │   ├── LiveCaption.tsx
│       │   ├── SubtitleOverlay.tsx
│       │   └── pdf/PdfUploader.tsx
│       └── hooks/
├── qvac-service/               # @qvac/sdk local AI bridge
│   └── server.js
├── electron/                   # Floating overlay
│   ├── main.js
│   ├── overlay.html
│   └── preload.js
├── docker-compose.yml
└── .env.example
```

## Kurulum (Adım Adım)

### 1. Gereksinimler

- Python 3.12+
- Node.js 20+
- (Önerilen) NVIDIA GPU + CUDA — Whisper + QVAC için
- QVAC SDK (lokal AI): https://qvac.tether.io/
- Together AI API key (sadece cloud mod): https://api.together.xyz

### 2. Ortam değişkenleri

```bash
cp .env.example .env
# Sovereign mode için TOGETHER_API_KEY boş bırakın
# LOCAL_PROCESSING_ONLY=true (varsayılan)
```

### 3. QVAC Local AI Bridge (önerilen — gizlilik)

```bash
cd qvac-service
npm install
npm start
```

### 4. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

İlk çalıştırmada Whisper `large-v3` modeli indirilir (~3GB).

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Tarayıcı: http://localhost:3000

### 6. Electron Overlay (toplantı üstü altyazı)

```bash
cd electron
npm install
npm start
```

Kısayollar:
- `Ctrl+Shift+O` — overlay göster/gizle
- `Ctrl+Shift+Up/Down` — font boyutu

### 7. Docker (tüm stack)

```bash
# Sovereign mode (QVAC + backend + frontend)
docker compose --profile sovereign up --build
```

Production PostgreSQL için:
```bash
docker compose --profile production up --build
```

## Kullanım

### Gerçek Zamanlı Altyazı

1. http://localhost:3000/live adresine gidin
2. Dil A (ör. Türkçe) ve Dil B (ör. İngilizce) seçin
3. **Oturumu Başlat** → mikrofon veya **Toplantı Sekmesi Sesi** (getDisplayMedia)
4. Zoom/Meet/Teams sekmesini paylaşarak karşı tarafın sesini de yakalayın
5. Altyazılar ekranın altında görünür; Electron overlay ile her uygulamanın üstünde kalır

### PDF Çeviri

1. http://localhost:3000/pdf
2. PDF/DOCX yükleyin, kaynak ve hedef dil seçin
3. Bilingual önizleme veya çevrilmiş PDF indirin

### Glossary API

```bash
curl -X POST http://localhost:8000/api/v1/glossary \
  -H "Content-Type: application/json" \
  -d '{"source":"GlobalBridge","target":"GlobalBridge","source_lang":"en","target_lang":"tr"}'
```

## Pipeline Mimarisi

```
Mikrofon/Sekme Sesi
    → WebSocket (binary PCM 16kHz)
    → Faster-Whisper STT (dil algılama)
    → Together AI Qwen/Llama (çeviri + glossary)
    → Overlay Service (broadcast)
    → Browser / Electron overlay
```

## System Prompt'lar

Tüm çeviri kalitesi `backend/prompts/translation_system.py` dosyasında:

- `build_live_caption_prompt()` — gerçek zamanlı altyazı
- `build_document_prompt()` — PDF/doküman
- `PAIR_EXAMPLES` — TR↔EN, ZH, AR, ES, DE, JA, KO, RU, FR örnekleri

## Performans Hedefleri

| Metrik | Hedef |
|--------|-------|
| STT gecikme | 300–800ms |
| Çeviri gecikme | 500–1200ms |
| Toplam | ≤ 1.5–2 sn |
| Altyazı süresi | 3.5 sn |

GPU yoksa: `WHISPER_MODEL=distil-large-v3` ve `WHISPER_DEVICE=cpu` kullanın.

## Lisans

MIT
