"use client";

import { Text } from "@web-kits/text";
import { useEffect, useState } from "react";
import styles from "../app/page.module.css";

const phrases = ["Interfaces", "Motion", "Type", "Presence", "Web Kits"];

export function TextPreview() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.textPreview}>
      <Text animation="smooth" drift={{ x: 18, y: 4 }} trend={-1}>
        {phrases[index]}
      </Text>
    </div>
  );
}
