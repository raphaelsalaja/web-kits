import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DrawerShell } from "@/components/drawer-shell";
import { MobileNav } from "@/components/mobile-nav";
import {
  SidebarAside,
  SidebarHeader,
  SidebarNav,
  SidebarRoot,
  SidebarTree,
} from "@/components/sidebar";
import { getKitTree } from "@/lib/docs/source";
import { getKit } from "@/lib/kits";
import styles from "./layout.module.css";

export default async function KitLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ kit: string }>;
}) {
  const { kit: slug } = await params;
  const kit = getKit(slug);
  const tree = getKitTree(slug);
  if (!kit || !tree) notFound();

  const sidebar = (
    <>
      <SidebarHeader name={kit.name} href={kit.href} version={kit.version} />
      <SidebarNav>
        <SidebarTree tree={tree} />
      </SidebarNav>
    </>
  );

  return (
    <DrawerShell>
      <div className={styles.layout}>
        <MobileNav name={kit.name} href={kit.href}>
          {sidebar}
        </MobileNav>
        <SidebarRoot>
          <SidebarAside>{sidebar}</SidebarAside>
        </SidebarRoot>
        <main className={styles.main}>{children}</main>
      </div>
    </DrawerShell>
  );
}
