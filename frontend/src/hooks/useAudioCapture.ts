"use client";

import { useCallback, useRef, useState } from "react";

const SAMPLE_RATE = 16000;
const CHUNK_MS = 500;

export function useAudioCapture(onChunk: (pcm: ArrayBuffer) => void) {
  const [recording, setRecording] = useState(false);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const bufferRef = useRef<Float32Array[]>([]);

  const floatTo16BitPCM = (float32: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: SAMPLE_RATE,
      },
    });

    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);

    let samplesCollected = 0;
    const chunkSamples = (SAMPLE_RATE * CHUNK_MS) / 1000;

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      bufferRef.current.push(new Float32Array(input));
      samplesCollected += input.length;

      if (samplesCollected >= chunkSamples) {
        const merged = new Float32Array(samplesCollected);
        let offset = 0;
        for (const buf of bufferRef.current) {
          merged.set(buf, offset);
          offset += buf.length;
        }
        onChunk(floatTo16BitPCM(merged));
        bufferRef.current = [];
        samplesCollected = 0;
      }
    };

    source.connect(processor);
    processor.connect(ctx.destination);

    streamRef.current = stream;
    ctxRef.current = ctx;
    processorRef.current = processor;
    setRecording(true);
  }, [deviceId, onChunk]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    processorRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
    bufferRef.current = [];
    setRecording(false);
  }, []);

  const listDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  }, []);

  return { recording, start, stop, listDevices, setDeviceId, deviceId };
}

/** Capture system/tab audio via getDisplayMedia (Zoom/Meet/Teams) */
export function useTabAudioCapture(onChunk: (pcm: ArrayBuffer) => void) {
  const [capturing, setCapturing] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const startTabCapture = useCallback(async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    const ctx = new AudioContext({ sampleRate: 16000 });
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const buffer = new ArrayBuffer(input.length * 2);
      const view = new DataView(buffer);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      onChunk(buffer);
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    setCapturing(true);

    stopRef.current = () => {
      processor.disconnect();
      ctx.close();
      stream.getTracks().forEach((t) => t.stop());
      setCapturing(false);
    };
  }, [onChunk]);

  const stopTabCapture = useCallback(() => stopRef.current?.(), []);

  return { capturing, startTabCapture, stopTabCapture };
}
