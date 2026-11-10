"use client";

import { ProgressiveBlur } from "@web-kits/blur/react";
import { type CSSProperties, useState } from "react";
import { Control, Controls } from "@/components/examples/controls";
import styles from "./edge.module.css";

const KINDS = ["iOS 27", "Stacked", "One Blur"] as const;
type Kind = (typeof KINDS)[number];

const HUES = [
  "var(--orange)",
  "var(--blue)",
  "var(--pink)",
  "var(--green)",
  "var(--purple)",
  "var(--red)",
] as const;

const ALBUMS = [
  ["Short Summer", "12 songs"],
  ["Night Swim", "9 songs"],
  ["Paper Planes", "14 songs"],
  ["Lowlands", "10 songs"],
  ["Static Bloom", "11 songs"],
  ["Warm Air", "8 songs"],
  ["Glass Hours", "13 songs"],
  ["Coastline", "10 songs"],
  ["Old Signals", "12 songs"],
  ["Slow Rivers", "9 songs"],
  ["Daylight", "15 songs"],
  ["Soft Machines", "11 songs"],
  ["Weather", "7 songs"],
  ["Last Light", "10 songs"],
] as const;

/** The usual progressive blur: layers of doubling blur, each masked to a band. */
const STACK = [1, 2, 4, 8, 16, 32];

function Stacked({ className }: { className: string }) {
  const n = STACK.length;
  const at = (i: number) => `${Math.min(100, Math.max(0, (i / n) * 100))}%`;
  return (
    <div className={className} aria-hidden>
      {STACK.map((blur, i) => {
        const mask = `linear-gradient(to top, transparent ${at(i)}, black ${at(i + 1)}, black ${at(i + 2)}, transparent ${at(i + 3)})`;
        return (
          <div
            key={blur}
            className={styles.layer}
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}

function OneBlur({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden>
      <div className={`${styles.layer} ${styles.one}`} />
    </div>
  );
}

export function Edge() {
  const [kind, setKind] = useState<Kind>("iOS 27");

  return (
    <div>
      <div className={styles.stage}>
        <ul className={styles.scroll}>
          {ALBUMS.map(([title, artist], i) => (
            <li key={title} className={styles.row}>
              <span
                className={styles.art}
                style={
                  {
                    "--from": HUES[i % HUES.length],
                    "--to": HUES[(i + 2) % HUES.length],
                  } as CSSProperties
                }
              />
              <span className={styles.text}>
                <span className={styles.title}>{title}</span>
                <span className={styles.artist}>{artist}</span>
              </span>
            </li>
          ))}
        </ul>
        {kind === "iOS 27" && <ProgressiveBlur className={styles.top} />}
        {kind === "Stacked" && <Stacked className={styles.top} />}
        {kind === "One Blur" && <OneBlur className={styles.top} />}
        <p className={styles.bar}>Library</p>
      </div>
      <Controls>
        <Control label="Blur" options={KINDS} value={kind} onChange={setKind} />
      </Controls>
    </div>
  );
}
