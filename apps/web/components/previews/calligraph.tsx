"use client";

import { Calligraph } from "calligraph";
import { useEffect, useState } from "react";
import styles from "./styles.module.css";

const words = ["Calligraph", "Craft", "Creative", "Create"];

export function CalligraphPreview() {
  const [index, setIndex] = useState(0);
  const next = () => setIndex((current) => (current + 1) % words.length);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.stage}>
      <button
        type="button"
        className={styles.word}
        aria-label={words[index]}
        onClick={next}
      >
        <Calligraph>{words[index]}</Calligraph>
      </button>
    </div>
  );
}
