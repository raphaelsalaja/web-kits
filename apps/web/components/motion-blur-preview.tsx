"use client";

import { MotionBlur } from "@web-kits/motion-blur/react";
import styles from "./previews.module.css";

export function MotionBlurPreview() {
  return (
    <div className={styles.fill}>
      <MotionBlur className={styles.chip}>
        <span className={styles.chipFace}>
          <span className={styles.chipDot} />
          Sent
        </span>
      </MotionBlur>
    </div>
  );
}
