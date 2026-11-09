"use client";

import { defineSound, ensureReady } from "@web-kits/audio";
import { useEffect, useMemo, useState } from "react";
import styles from "./previews.module.css";

export function AudioPreview() {
  const [ready, setReady] = useState(false);

  const sounds = useMemo(
    () => ({
      click: defineSound({
        source: { type: "sine", frequency: { start: 1400, end: 280 } },
        envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.04 },
        gain: 0.28,
      }),
      blip: defineSound({
        source: { type: "triangle", frequency: { start: 720, end: 420 } },
        envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.05 },
        gain: 0.22,
      }),
      soft: defineSound({
        source: { type: "sine", frequency: { start: 420, end: 180 } },
        envelope: { attack: 0.01, decay: 0.22, sustain: 0, release: 0.12 },
        gain: 0.2,
      }),
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    ensureReady().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`${styles.fill} ${styles.audio}`}>
      {(
        [
          ["click", "Click"],
          ["blip", "Blip"],
          ["soft", "Soft"],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={styles.soundButton}
          disabled={!ready}
          onClick={() => sounds[key]()}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
