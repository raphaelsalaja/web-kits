"use client";

import { useCaret } from "@web-kits/react/caret";
import { useId, useState } from "react";
import { Control, Controls } from "@/components/examples/controls";
import styles from "./fields.module.css";

const KINDS = ["iOS", "macOS", "Browser"] as const;
type Kind = (typeof KINDS)[number];

function Smooth({ kind }: { kind: "ios" | "macos" }) {
  const input = useCaret({ style: kind });
  const area = useCaret({ style: kind });
  const note = useCaret({ style: kind });

  return <Fields input={input} area={area} note={note} />;
}

function Fields({
  input,
  area,
  note,
}: {
  input?: (field: HTMLElement | null) => void;
  area?: (field: HTMLElement | null) => void;
  note?: (field: HTMLElement | null) => void;
}) {
  const lyrics = useId();
  return (
    <div className={styles.stage}>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          ref={input}
          className={styles.input}
          defaultValue="Short Summer"
          spellCheck={false}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Notes</span>
        <textarea
          ref={area}
          className={styles.input}
          rows={3}
          defaultValue={
            "Twelve songs written over one warm August.\nTrack four is the single."
          }
          spellCheck={false}
        />
      </label>
      <div className={styles.field}>
        <span id={lyrics} className={styles.label}>
          Lyrics
        </span>
        {/* biome-ignore lint/a11y/useSemanticElements: this field shows the caret in contenteditable */}
        <div
          ref={note}
          className={styles.input}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          tabIndex={0}
          aria-labelledby={lyrics}
          spellCheck={false}
        >
          We drove out past the lowlands with the windows down.
        </div>
      </div>
    </div>
  );
}

export function CaretFields() {
  const [kind, setKind] = useState<Kind>("iOS");

  return (
    <div>
      {kind === "Browser" ? (
        <Fields />
      ) : (
        <Smooth kind={kind === "iOS" ? "ios" : "macos"} />
      )}
      <Controls>
        <Control
          label="Caret"
          options={KINDS}
          value={kind}
          onChange={setKind}
        />
      </Controls>
    </div>
  );
}
