"use client";

import { click } from "@audio/core";
import {
  defineSound,
  type SoundDefinition,
  useSound,
} from "@web-kits/react/sound";
import Link from "next/link";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CodePreview } from "@/components/audio/builder/code-preview";
import { soundToCode } from "@/components/audio/builder/state";
import ChevronRight from "@/components/icons/fill/chevron-right";
import CircleUser from "@/components/icons/fill/circle-user";
import Playlist4 from "@/components/icons/fill/playlist-4";
import { colorScale } from "@/lib/colors";
import type { Patch } from "@/lib/registry";
import { loadSounds } from "@/lib/sounds";
import styles from "./styles.module.css";

interface PatchDetailContextValue {
  patch: Patch;
  sounds: Record<string, SoundDefinition> | null;
  selected: string | undefined;
  select: (name: string) => void;
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
  const [sounds, setSounds] = useState<Record<string, SoundDefinition> | null>(
    null,
  );
  const [selected, select] = useState<string | undefined>(patch.sounds[0]);

  useEffect(() => {
    let cancelled = false;
    loadSounds(patch.name)
      .then((loaded) => {
        if (!cancelled) setSounds(loaded);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [patch.name]);

  return (
    <div className={styles.main}>
      <PatchDetailContext value={{ patch, sounds, selected, select }}>
        {children}
      </PatchDetailContext>
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

function Code() {
  const { sounds, selected } = usePatchDetail();
  const definition = selected ? sounds?.[selected] : undefined;
  if (!selected || !definition) return null;
  return (
    <div className={styles.code}>
      <CodePreview title={selected} code={soundToCode(selected, definition)} />
    </div>
  );
}

function Sounds() {
  const { patch: patchData, sounds, select } = usePatchDetail();

  const [playing, setPlaying] = useState<string | null>(null);

  const voiceRef = useRef<{ stop: (t?: number) => void } | null>(null);

  const playingRef = useRef<string | null>(null);

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

      const definition = sounds?.[soundName];
      if (!definition) return;

      select(soundName);
      const voice = defineSound(definition)();
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
    [sounds, select],
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
          const isAvailable = Boolean(sounds?.[sound]);
          const isPlaying = playing === sound;
          return (
            <button
              key={sound}
              type="button"
              className={styles.card}
              data-playing={isPlaying}
              data-available={isAvailable}
              onClick={() => handlePlay(sound)}
              disabled={!sounds}
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

export { Breadcrumb, Code, Description, Header, Layout, Main, Root, Sounds };
