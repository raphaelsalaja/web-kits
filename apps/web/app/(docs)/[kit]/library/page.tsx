import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPatchesAllTime } from "@/lib/db/patches";
import { View } from "./_components/view";
import styles from "./styles.module.css";

export const dynamic = "force-dynamic";

const description = "Browse and discover community sound patches for your UI.";

export const metadata: Metadata = {
  title: "Library › Audio",
  description,
  alternates: { canonical: "/audio/library" },
  openGraph: { title: "Library › Audio", description, url: "/audio/library" },
};

export default async function LibraryPage({
  params,
}: {
  params: Promise<{ kit: string }>;
}) {
  const { kit } = await params;
  if (kit !== "audio") notFound();

  const patches = await getPatchesAllTime();

  return (
    <div className={styles.page}>
      <View patches={patches} />
    </div>
  );
}
