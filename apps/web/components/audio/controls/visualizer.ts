"use client";

import type { AudioAnalyser } from "@web-kits/react/sound";
import { createMasterAnalyser } from "@web-kits/react/sound";
import { useCallback, useEffect, useRef } from "react";

/** Canvas can't parse `light-dark()` or `var()`, so read the colour back through CSS. */
function resolveColor(el: HTMLElement, property: string): string {
  const value = getComputedStyle(el).getPropertyValue(property).trim();
  if (!value) return "";
  const previous = el.style.color;
  el.style.color = value;
  const resolved = getComputedStyle(el).color;
  el.style.color = previous;
  return resolved;
}

export function useVisualizer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const analyserRef = useRef<AudioAnalyser | null>(null);
  const frameRef = useRef<number>(0);
  const activeRef = useRef(false);
  const decayRef = useRef<Float32Array | null>(null);

  const start = useCallback(() => {
    if (!analyserRef.current) {
      analyserRef.current = createMasterAnalyser({
        fftSize: 256,
        smoothingTimeConstant: 0.7,
      });
    }
    activeRef.current = true;

    const target = canvasRef.current;
    const flat = target ? resolveColor(target, "--vis-color") : "";
    const colorLow = target ? resolveColor(target, "--vis-color-low") : "";
    const colorMid = target ? resolveColor(target, "--vis-color-mid") : "";
    const colorHigh = target ? resolveColor(target, "--vis-color-high") : "";
    const useGradient = !!colorLow;

    const draw = () => {
      const canvas = canvasRef.current;
      const analyser = analyserRef.current;
      if (!canvas || !analyser) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
      }

      const freq = analyser.getFrequencyData();
      const barCount = Math.min(freq.length, 64);

      if (!decayRef.current || decayRef.current.length !== barCount) {
        decayRef.current = new Float32Array(barCount);
      }
      const decay = decayRef.current;

      ctx.clearRect(0, 0, w, h);

      const gap = 2;
      const barWidth = (w - gap * (barCount - 1)) / barCount;

      let hasSignal = false;

      for (let i = 0; i < barCount; i++) {
        const raw = freq[i] / 255;
        if (raw > decay[i]) {
          decay[i] = raw;
        } else {
          decay[i] *= 0.92;
        }
        if (decay[i] > 0.005) hasSignal = true;

        const barH = decay[i] * h * 0.85;
        const x = i * (barWidth + gap);
        const radius = Math.min(barWidth / 2, 2);

        if (barH > 0.5) {
          ctx.beginPath();
          ctx.roundRect(x, h - barH, barWidth, barH, radius);

          if (useGradient) {
            const grad = ctx.createLinearGradient(0, h, 0, h - barH);
            grad.addColorStop(0, colorLow);
            if (colorMid) grad.addColorStop(0.5, colorMid);
            if (colorHigh) grad.addColorStop(1, colorHigh);
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = flat || "rgba(0,0,0,0.15)";
          }

          ctx.fill();
        }
      }

      if (hasSignal || activeRef.current) {
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    cancelAnimationFrame(frameRef.current);
    draw();
  }, [canvasRef]);

  const stop = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(frameRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }, [canvasRef]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      analyserRef.current?.dispose();
    };
  }, []);

  return { start, stop };
}
