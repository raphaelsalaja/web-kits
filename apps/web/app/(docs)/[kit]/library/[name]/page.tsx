import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPatchByName, getPatchSounds } from "@/lib/db/patches";
import styles from "../styles.module.css";
import * as View from "./_components/view";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ kit: string; name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kit, name } = await params;
  if (kit !== "audio") return {};
  const patch = await getPatchByName(name);
  if (!patch) return { title: "Not Found" };

  const title = `${patch.name} by ${patch.author}`;
  const url = `/audio/library/${name}`;

  return {
    title,
    description: patch.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: patch.description ?? undefined,
      url,
    },
  };
}

export default async function Page({ params }: Props) {
  const { kit, name } = await params;
  if (kit !== "audio") notFound();

  const patch = await getPatchByName(name);

  if (!patch) notFound();

  const sounds = await getPatchSounds(patch.id);

  return (
    <div className={styles.page}>
      <View.Root patch={patch} sounds={sounds}>
        <View.Breadcrumb />
        <View.Main>
          <View.Header />
          <View.Install />
          <View.Sounds />
        </View.Main>
      </View.Root>
    </div>
  );
}
