"use client";

import ArrowUpRight from "@web-kits/icons/outline/arrow-up-right";
import type {
  Folder,
  Item,
  Node,
  Root as PageTree,
  Separator,
} from "fumadocs-core/page-tree";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./styles.module.css";

interface SidebarContextValue {
  pathname: string;
  onNavigate?: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const ctx = use(SidebarContext);
  if (!ctx) throw new Error("Sidebar.* must be used within Sidebar.Root");
  return ctx;
}

function SidebarRoot({
  children,
  onNavigate,
}: {
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const value = useMemo<SidebarContextValue>(
    () => ({ pathname, onNavigate }),
    [pathname, onNavigate],
  );
  return <SidebarContext value={value}>{children}</SidebarContext>;
}

function SidebarAside({ children }: { children: React.ReactNode }) {
  return <aside className={styles.sidebar}>{children}</aside>;
}

function SidebarHeader({
  name,
  href,
  version,
}: {
  name: string;
  href: string;
  version: string;
}) {
  const { onNavigate } = useSidebar();
  return (
    <div className={styles.header}>
      <Link href="/" className={styles.home} onClick={onNavigate}>
        Web Kits
      </Link>
      <Link href={href} className={styles.kit} onClick={onNavigate}>
        {name}
        <span className={styles.version}>{version}</span>
      </Link>
    </div>
  );
}

function SidebarNav({ children }: { children: React.ReactNode }) {
  return <nav className={styles.nav}>{children}</nav>;
}

function SidebarLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const { pathname, onNavigate } = useSidebar();
  const active = pathname === href;

  if (external) {
    return (
      <a
        href={href}
        className={styles.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
      >
        {children}
        <ArrowUpRight
          aria-hidden="true"
          width={12}
          height={12}
          className={styles.externalArrow}
        />
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`${styles.link} ${active ? styles.active : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

function SidebarSeparatorItem({ name }: { name?: React.ReactNode }) {
  if (!name) return <div className={styles.divider} />;
  return <div className={styles.sectionLabel}>{name}</div>;
}

function SidebarFolder({
  name,
  href,
  children,
}: {
  name: string;
  href?: string;
  children: React.ReactNode;
}) {
  const { pathname, onNavigate } = useSidebar();

  const folderPath = href ? href.replace(/\/[^/]+$/, "") : undefined;
  const isActive = folderPath
    ? pathname.startsWith(folderPath)
    : href
      ? pathname.startsWith(href)
      : false;

  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const chevron = (
    <motion.svg
      aria-hidden={true}
      className={styles.chevron}
      animate={{ rotate: open ? 90 : 0 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 4l4 4-4 4" />
    </motion.svg>
  );

  return (
    <div className={styles.folder}>
      {href ? (
        <div
          className={`${styles.folderLabelRow} ${isActive ? styles.folderLabelActive : ""}`}
        >
          <Link
            href={href}
            className={styles.folderLabelLink}
            onClick={() => {
              setOpen(true);
              onNavigate?.();
            }}
          >
            {name}
          </Link>
          <button
            type="button"
            className={styles.chevronButton}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${name}`}
            onClick={(e) => {
              e.preventDefault();
              setOpen((v) => !v);
            }}
          >
            {chevron}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.folderLabel} ${isActive ? styles.folderLabelActive : ""}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {name}
          {chevron}
        </button>
      )}
      <FolderChildren open={open}>{children}</FolderChildren>
    </div>
  );
}

function measureActive(el: HTMLDivElement) {
  const active = el.querySelector(`.${styles.active}`) as HTMLElement | null;
  if (active) {
    el.style.setProperty("--active-top", `${active.offsetTop}px`);
    el.style.setProperty("--active-opacity", "1");
  } else {
    el.style.setProperty("--active-opacity", "0");
  }
}

function FolderChildren({
  children,
  open,
}: {
  children: React.ReactNode;
  open: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useSidebar();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname + open affect active rail position
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    measureActive(el);
  }, [pathname, open]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: "hidden" }}
        >
          <div ref={ref} className={styles.folderChildren}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SidebarTreeNode({ node }: { node: Node }) {
  switch (node.type) {
    case "page": {
      const item = node as Item;
      return (
        <SidebarLink href={item.url} external={item.external}>
          {item.name}
        </SidebarLink>
      );
    }
    case "separator":
      return <SidebarSeparatorItem name={(node as Separator).name} />;
    case "folder": {
      const folder = node as Folder;
      const firstPage =
        folder.index ??
        folder.children.find((c): c is Item => c.type === "page");
      return (
        <SidebarFolder name={String(folder.name)} href={firstPage?.url}>
          {folder.children.map((child) => (
            <SidebarTreeNode
              key={child.$id ?? String(child.name)}
              node={child}
            />
          ))}
        </SidebarFolder>
      );
    }
    default:
      return null;
  }
}

function SidebarTree({ tree }: { tree: PageTree | Folder }) {
  return (
    <>
      {tree.children.map((node) => (
        <SidebarTreeNode key={node.$id ?? String(node.name)} node={node} />
      ))}
    </>
  );
}

export { SidebarAside, SidebarHeader, SidebarNav, SidebarRoot, SidebarTree };
