import type { ComponentProps, ReactNode } from "react";
import { Segmented } from "./segmented";
import styles from "./styles.module.css";

export function Controls({ children }: { children: ReactNode }) {
  return (
    <div className={styles.controls} data-controls>
      {children}
    </div>
  );
}

export function Control<T extends string>({
  label,
  options,
  value,
  onChange,
  children,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Shown in place of the label, and truncated before the options are. */
  children?: ReactNode;
}) {
  return (
    <div className={styles.control}>
      {children ? (
        <div className={styles.custom}>{children}</div>
      ) : (
        <span className={styles.label} aria-hidden>
          {label}
        </span>
      )}
      <div className={styles.scroll}>
        <Segmented
          label={label}
          options={options}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export function ControlButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={className ? `${styles.button} ${className}` : styles.button}
      {...props}
    />
  );
}
