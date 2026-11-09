"use client";

import { MotionBlur } from "@web-kits/motion-blur/react";
import styles from "./styles.module.css";

export function MotionBlurPreview() {
  return (
    <div className={styles.stage}>
      <MotionBlur className={styles.chip}>
        <span className={styles.chipFace}>
          <span className={styles.chipDot} />
          Sent
        </span>
      </MotionBlur>
    </div>
  );
}
