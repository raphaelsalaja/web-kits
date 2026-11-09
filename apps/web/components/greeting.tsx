"use client";

import { useSyncExternalStore } from "react";
import styles from "../app/page.module.css";

function getGreeting(date: Date) {
  const hours = date.getHours();
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  let period = "Good evening.";
  if (hours < 12) period = "Good morning.";
  else if (hours < 18) period = "Good afternoon.";

  return `It's ${time}. ${period}`;
}

function subscribe() {
  return () => {};
}

export function Greeting() {
  const greeting = useSyncExternalStore(
    subscribe,
    () => getGreeting(new Date()),
    () => "Welcome.",
  );

  return <p className={styles.greeting}>{greeting}</p>;
}
