import { flattenTree } from "fumadocs-core/page-tree";
import { notFound } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";
import { SoundBuilder } from "@/components/audio/builder";
import { Demo, DemoGrid } from "@/components/audio/demo";
import { Playground } from "@/components/audio/playground";
import { Card, CardGrid } from "@/components/card";
import { Pre, Tabs } from "@/components/code-block";
import { CopyForLLM } from "@/components/copy-for-llm";
import { Edge } from "@/components/examples/blur/edge";
import { Example } from "@/components/examples/frame";
import { Examples as MotionBlurExamples } from "@/components/examples/motion-blur/examples";
import { Lab, Orbit, Snap, Throw } from "@/components/examples/motion-blur/lab";
import { Keypad } from "@/components/examples/react/keypad";
import { NumberTransitionExample } from "@/components/examples/react/number-transition";
import { TextTransitionExample } from "@/components/examples/react/text-transition";
import { TransactionStatus } from "@/components/examples/react/transaction-status";
import { Genie } from "@/components/examples/springboard/genie";
import { GlassMenu } from "@/components/examples/springboard/glass-menu";
import { Launch } from "@/components/examples/springboard/launch";
import { PageNav } from "@/components/page-nav";
import { CalligraphPreview } from "@/components/previews/calligraph";
import proseStyles from "@/components/prose/styles.module.css";
import { TableWrapper } from "@/components/prose/table-wrapper";
import { Step, Steps } from "@/components/steps";
import { TableOfContents } from "@/components/toc";
import { getKitTree, source } from "@/lib/docs/source";
import { getKit, site } from "@/lib/kits";
import styles from "./styles.module.css";

type Props = {
  params: Promise<{ kit: string; slug?: string[] }>;
};

function Table(props: ComponentPropsWithoutRef<"table">) {
  return (
    <TableWrapper>
      <table {...props} />
    </TableWrapper>
  );
}

async function getPage(props: Props) {
  const { kit, slug = [] } = await props.params;
  return source.getPage([kit, ...slug]);
}

export default async function Page(props: Props) {
  const page = await getPage(props);
  if (!page) notFound();

  const { body: MDX, toc } = page.data;
  const pages = flattenTree(getKitTree(page.slugs[0])?.children ?? []).filter(
    (item) => !item.external,
  );
  const index = pages.findIndex((item) => item.url === page.url);

  return (
    <>
      <article className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{page.data.title}</h1>
          <CopyForLLM />
        </div>
        <div className={proseStyles.prose}>
          <MDX
            components={{
              pre: Pre,
              table: Table,
              CalligraphPreview,
              Card,
              CardGrid,
              Demo,
              DemoGrid,
              Edge,
              Example,
              Genie,
              GlassMenu,
              Keypad,
              Lab,
              Launch,
              MotionBlurExamples,
              NumberTransitionExample,
              Orbit,
              Playground,
              Snap,
              SoundBuilder,
              Step,
              Steps,
              Tabs,
              TextTransitionExample,
              Throw,
              TransactionStatus,
            }}
          />
        </div>
        <PageNav previous={pages[index - 1]} next={pages[index + 1]} />
      </article>
      <TableOfContents toc={toc} />
    </>
  );
}

export const dynamicParams = false;

export function generateStaticParams() {
  return source.generateParams().map(({ slug }) => ({
    kit: slug[0],
    slug: slug.slice(1),
  }));
}

export async function generateMetadata(props: Props) {
  const page = await getPage(props);
  if (!page) notFound();

  const kit = getKit(page.slugs[0]);
  const isIndex = page.slugs.length === 1;
  const title = isIndex ? kit?.name : `${page.data.title} › ${kit?.name}`;

  return {
    title,
    description: page.data.description,
    alternates: { canonical: page.url },
    openGraph: {
      title,
      description: page.data.description,
      url: `${site.url}${page.url}`,
    },
  };
}
