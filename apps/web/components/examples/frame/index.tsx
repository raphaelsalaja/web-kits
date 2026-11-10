import type { ReactNode } from "react";
import styles from "./styles.module.css";

export function Example({ children }: { children: ReactNode }) {
  return (
    <div className={styles.example} data-example>
      {children}
    </div>
  );
}
