"use client";

import { launch } from "@web-kits/springboard";
import { useOrigin } from "@web-kits/springboard/react";
import { useEffect, useRef, useState } from "react";
import styles from "./previews.module.css";

const effect = launch({ grid: { columns: 6, rows: 4 } });

export function SpringboardPreview() {
  const stage = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLButtonElement>(null);
  const done = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const note = useOrigin({
    from: icon,
    bounds: stage,
    effect,
    open,
  });

  useEffect(() => {
    if (open) done.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    icon.current?.focus();
  }

  return (
    <div ref={stage} className={styles.fill}>
      <button
        ref={icon}
        type="button"
        className={styles.appIcon}
        aria-label="Open Notes"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      <div
        ref={note}
        className={styles.note}
        role="dialog"
        aria-label="Notes"
        inert={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <div>
          <p className={styles.noteTitle}>Notes</p>
          <p className={styles.noteText}>Opened out of its icon.</p>
        </div>
        <button
          ref={done}
          type="button"
          className={styles.noteDone}
          onClick={close}
        >
          Done
        </button>
      </div>
    </div>
  );
}
