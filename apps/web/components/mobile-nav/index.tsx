"use client";

import { Drawer } from "@base-ui/react/drawer";
import Link from "next/link";
import { type ReactNode, useCallback, useState } from "react";
import { useDrawerPortalContainer } from "@/components/drawer-shell";
import { SidebarRoot } from "@/components/sidebar";
import styles from "./styles.module.css";

export function MobileNav({
  name,
  href,
  children,
}: {
  name: string;
  href: string;
  children: ReactNode;
}) {
  const portalContainer = useDrawerPortalContainer();
  const [open, setOpen] = useState(false);
  const closeDrawer = useCallback(() => setOpen(false), []);

  return (
    <nav className={styles.nav}>
      <div className={styles.crumbs}>
        <Link href="/" className={styles.home}>
          Web Kits
        </Link>
        <span className={styles.slash} aria-hidden="true">
          /
        </span>
        <Link href={href} className={styles.kit}>
          {name}
        </Link>
      </div>
      <Drawer.Root open={open} onOpenChange={setOpen} modal={false}>
        <Drawer.Trigger className={styles.menuButton} aria-label="Menu">
          <MenuIcon open={open} />
        </Drawer.Trigger>
        <Drawer.Portal container={portalContainer}>
          <Drawer.Backdrop className={styles.backdrop} />
          <Drawer.Viewport className={styles.viewport}>
            <Drawer.Popup className={styles.popup}>
              <div className={styles.handle} />
              <Drawer.Content className={styles.content}>
                <SidebarRoot onNavigate={closeDrawer}>{children}</SidebarRoot>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </nav>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <line x1="4" y1="4" x2="12" y2="12" />
          <line x1="12" y1="4" x2="4" y2="12" />
        </>
      ) : (
        <>
          <line x1="2" y1="5.5" x2="14" y2="5.5" />
          <line x1="2" y1="10.5" x2="14" y2="10.5" />
        </>
      )}
    </svg>
  );
}
