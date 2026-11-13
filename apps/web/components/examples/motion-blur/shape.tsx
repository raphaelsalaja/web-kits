import styles from "./styles.module.css";

export function Shape({ kind = "square" }: { kind?: "square" | "circle" }) {
  return <div className={styles.shape} data-kind={kind} />;
}
