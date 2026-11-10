import type { Metadata } from "next";
import { patches } from "@/lib/registry";
import { View } from "./_components/view";
import styles from "./styles.module.css";

const description = "Browse sound patches for your UI.";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ kit: "audio" }];
}

export const metadata: Metadata = {
  title: "Library › Audio",
  description,
  alternates: { canonical: "/audio/library" },
  openGraph: { title: "Library › Audio", description, url: "/audio/library" },
};

export default function LibraryPage() {
  return (
    <div className={styles.page}>
      <View patches={patches} />
    </div>
  );
}
