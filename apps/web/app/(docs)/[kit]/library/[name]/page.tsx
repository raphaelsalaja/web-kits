import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPatch, patches } from "@/lib/registry";
import styles from "../styles.module.css";
import * as View from "./_components/view";

export const dynamicParams = false;

export function generateStaticParams() {
  return patches.map(({ name }) => ({ kit: "audio", name }));
}

type Props = {
  params: Promise<{ kit: string; name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const patch = getPatch(name);
  if (!patch) return { title: "Not Found" };

  const title = `${patch.name} by ${patch.author}`;
  const url = `/audio/library/${name}`;

  return {
    title,
    description: patch.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: patch.description,
      url,
    },
  };
}

export default async function Page({ params }: Props) {
  const { name } = await params;
  const patch = getPatch(name);
  if (!patch) notFound();

  return (
    <div className={styles.page}>
      <View.Root patch={patch}>
        <View.Breadcrumb />
        <View.Main>
          <View.Header />
          <View.Sounds />
          <View.Code />
        </View.Main>
      </View.Root>
    </div>
  );
}
