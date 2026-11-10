import type { ReactNode } from "react";
import styles from "./kit-icon.module.css";

const lines = (
  <>
    <span className={styles.line} />
    <span className={styles.line} />
    <span className={styles.line} />
  </>
);

const icons: Record<string, ReactNode> = {
  audio: (
    <span className={styles.bars}>
      {[6, 12, 20, 10, 15, 8].map((height) => (
        <span key={height} className={styles.bar} style={{ height }} />
      ))}
    </span>
  ),
  springboard: (
    <span className={styles.launch}>
      <span className={styles.paper}>{lines}</span>
      <span className={styles.app} />
    </span>
  ),
  blur: (
    <span className={styles.paper}>
      {lines}
      {lines}
      <span className={styles.edge} />
    </span>
  ),
  "motion-blur": (
    <span className={styles.streak}>
      <span className={styles.chip} />
      <span className={styles.chip} />
      <span className={styles.chip}>
        <span className={styles.dot} />
      </span>
    </span>
  ),
  react: (
    <span className={styles.glyphs}>
      1<span className={styles.morph}>2</span>
    </span>
  ),
  calligraph: (
    <span className={styles.glyphs}>
      A<span className={styles.morph}>a</span>
    </span>
  ),
};

export function KitIcon({ slug }: { slug: string }) {
  return (
    <span className={styles.tile} aria-hidden="true">
      {icons[slug]}
    </span>
  );
}
