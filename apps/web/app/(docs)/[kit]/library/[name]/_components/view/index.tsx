"use client";

import { click } from "@audio/core";
import { usePatch, useSound } from "@web-kits/audio/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ChevronRight from "@/components/icons/fill/chevron-right";
import CircleUser from "@/components/icons/fill/circle-user";
import Playlist4 from "@/components/icons/fill/playlist-4";
import Check from "@/components/icons/outline/check";
import Clone from "@/components/icons/outline/clone";
import { colorScale } from "@/lib/colors";
import type { Patch } from "@/lib/registry";
import styles from "./styles.module.css";

const MotionCheck = motion.create(Check);
const MotionClone = motion.create(Clone);

interface PatchDetailContextValue {
  patch: Patch;
}

const PatchDetailContext = createContext<PatchDetailContextValue | null>(null);

function usePatchDetail(): PatchDetailContextValue {
  const ctx = use(PatchDetailContext);
  if (!ctx) {
    throw new Error("usePatchDetail must be used within PatchDetail.Root");
  }
  return ctx;
}

function Root({
  patch,
  children,
}: {
  patch: Patch;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.main}>
      <PatchDetailContext value={{ patch }}>{children}</PatchDetailContext>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return <div className={styles.layout}>{children}</div>;
}

function Main({ children }: { children: React.ReactNode }) {
  return <div className={styles.content}>{children}</div>;
}

function Breadcrumb() {
  const { patch } = usePatchDetail();
  const playClick = useSound(click);

  return (
    <nav className={styles.breadcrumb}>
      <Link href="/audio/library" className={styles.link} onClick={playClick}>
        Library
      </Link>
      <span className={styles.separator}>
        <ChevronRight strokewidth={2} width={12} height={12} />
      </span>
      <span className={styles.current}>{patch.name}</span>
    </nav>
  );
}

function Description() {
  const { patch } = usePatchDetail();
  if (!patch.description) return null;
  return <p className={styles.description}>{patch.description}</p>;
}

function Header() {
  const { patch } = usePatchDetail();

  return (
    <div className={styles.header}>
      <span className={styles.title}>
        <h1 className={styles.text}>{patch.name}</h1>

        <span className={styles.detail}>
          <span className={styles.version}>v{patch.version}</span>
        </span>
      </span>

      <p className={styles.description}>{patch.description}</p>

      <div className={styles.details}>
        <span className={styles.detail}>
          <CircleUser width={16} height={16} />
          {patch.author}
        </span>
      </div>
    </div>
  );
}

function Install() {
  const { patch } = usePatchDetail();

  const snippet = `npx @web-kits/audio add raphaelsalaja/audio --patch ${patch.name}`;

  const [copied, setCopied] = useState(false);

  const props = {
    width: 14,
    height: 14,
    strokewidth: 2,
    initial: { opacity: 0, scale: 0.95, filter: "blur(2px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.95, filter: "blur(2px)" },
    transition: { duration: 0.18, ease: "easeInOut" },
    style: { display: "flex" },
  } as const;

  return (
    <code className={styles.snippet}>
      <span className="line">$ {snippet}</span>

      <button
        type="button"
        className={styles.copy}
        onClick={() => {
          navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <MotionCheck key="check" {...props} />
          ) : (
            <MotionClone key="clone" {...props} />
          )}
        </AnimatePresence>
      </button>
    </code>
  );
}

function Sounds() {
  const { patch: patchData } = usePatchDetail();

  const patch = usePatch(`/api/patch/${patchData.name}`);

  const [playing, setPlaying] = useState<string | null>(null);

  const voiceRef = useRef<{ stop: (t?: number) => void } | null>(null);

  const playingRef = useRef<string | null>(null);

  const soundSet = useMemo(() => new Set(patch.sounds), [patch.sounds]);

  const handlePlay = useCallback(
    (soundName: string) => {
      if (voiceRef.current) {
        voiceRef.current.stop();
        voiceRef.current = null;
      }

      if (playingRef.current === soundName) {
        playingRef.current = null;
        setPlaying(null);
        return;
      }

      if (!patch.ready) return;
      if (!soundSet.has(soundName)) return;

      const voice = patch.play(soundName);
      voiceRef.current = voice;
      playingRef.current = soundName;
      setPlaying(soundName);

      setTimeout(() => {
        if (playingRef.current === soundName) {
          playingRef.current = null;
          voiceRef.current = null;
        }
        setPlaying((current) => (current === soundName ? null : current));
      }, 3000);
    },
    [patch, soundSet],
  );

  useEffect(
    () => () => {
      if (voiceRef.current) voiceRef.current.stop();
    },
    [],
  );

  if (patchData.sounds.length === 0) return null;

  return (
    <div className={styles.preview}>
      <h2 className={styles.title}>
        <div className={styles.icon}>
          <Playlist4 width={16} height={16} />
        </div>
        <span className={styles.text}>Preview Sounds</span>
      </h2>
      <div className={styles.grid}>
        {patchData.sounds.map((sound) => {
          const isAvailable = patch.ready && soundSet.has(sound);
          const isPlaying = playing === sound;
          return (
            <button
              key={sound}
              type="button"
              className={styles.card}
              data-playing={isPlaying}
              data-available={isAvailable}
              onClick={() => handlePlay(sound)}
              disabled={!patch.ready}
              style={colorScale(sound)}
            >
              {sound}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Breadcrumb, Description, Header, Install, Layout, Main, Root, Sounds };
