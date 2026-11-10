"use client";

import { NumberTransition } from "@web-kits/react/number-transition";
import { useState } from "react";
import styles from "./styles.module.css";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

function type(amount: string, key: string) {
  if (key === "⌫") return amount.length > 1 ? amount.slice(0, -1) : "0";
  if (key === ".") return amount.includes(".") ? amount : `${amount}.`;
  const [whole, fraction] = amount.split(".");
  if (fraction?.length === 2 || whole.length === 9) return amount;
  return amount === "0" ? key : amount + key;
}

export function Keypad() {
  const [amount, setAmount] = useState("0");
  const fraction = amount.split(".")[1]?.length ?? 0;

  return (
    <div className={`${styles.stage} ${styles.wallet}`}>
      <NumberTransition
        value={Number(amount)}
        format={{
          style: "currency",
          currency: "USD",
          minimumFractionDigits: fraction,
          maximumFractionDigits: 2,
        }}
        locales="en-US"
        transition="family-input"
      />
      <div className={styles.keypad}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.key}
            aria-label={key === "⌫" ? "Delete" : undefined}
            onClick={() => setAmount((value) => type(value, key))}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
