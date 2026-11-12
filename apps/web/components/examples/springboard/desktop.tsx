"use client";

import {
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
} from "react";
import styles from "./desktop.module.css";
import { TILES, type Tile } from "./shared";

export { styles as desktop };

// The Dock's thresholds are in points, so the desktop is treated as a screen
// this many points wide. Matches --pt in desktop.module.css.
export const SCREEN_POINTS = 1280;

export type App = Tile["id"];

export const DOCK = TILES;

/** Left, top and width as fractions of the screen; height in screen widths. */
export type Placement = { x: number; y: number; width: number; height: number };

export const place = ({ x, y, width, height }: Placement): CSSProperties => ({
  left: `${x * 100}%`,
  top: `${y * 100}%`,
  width: `${width * 100}cqw`,
  height: `${height * 100}cqw`,
});

export const tint = (app: App) =>
  ({
    "--tint": TILES.find((tile) => tile.id === app)?.color,
  }) as CSSProperties;

export function Screen({
  aspect,
  style,
  ref,
  children,
}: {
  aspect?: number;
  style?: CSSProperties;
  ref?: RefObject<HTMLDivElement | null> | ((node: HTMLDivElement) => void);
  children: ReactNode;
}) {
  return (
    <div
      ref={ref}
      className={styles.screen}
      style={aspect ? { aspectRatio: aspect, ...style } : style}
    >
      {children}
    </div>
  );
}

export function Dock({
  size = 72,
  style,
  children,
}: {
  /** Icon size in points. */
  size?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.dock}
      style={
        { "--icon": `calc(${size} * var(--pt))`, ...style } as CSSProperties
      }
    >
      {children}
      <span className={styles.divider} />
      <button type="button" className={styles.dockItem} aria-label="Trash" />
    </div>
  );
}

export function DockItem({
  app,
  running,
  ...props
}: ComponentProps<"button"> & { app: App; running?: boolean }) {
  const tile = TILES.find((tile) => tile.id === app);
  return (
    <button
      type="button"
      className={styles.dockItem}
      aria-label={tile?.name}
      data-running={running || undefined}
      style={{ "--tint": tile?.color } as CSSProperties}
      {...props}
    />
  );
}

export function Lights({
  label,
  minimise,
  onMinimise,
}: {
  label: string;
  /** Replaces the yellow light, like a Base UI Dialog.Close. */
  minimise?: ReactNode;
  onMinimise?: () => void;
}) {
  return (
    <div className={styles.lights}>
      <span />
      {minimise ?? (
        <button
          type="button"
          aria-label={`Minimise ${label}`}
          onClick={onMinimise}
        />
      )}
      <span />
    </div>
  );
}

/** Whether a click on a window was a tap, rather than the end of a drag. */
export const tapped = (event: MouseEvent<HTMLElement>) =>
  event.currentTarget.dataset.dragged === undefined;

/**
 * Drags a window inside the screen. The window keeps its position as
 * fractions of the screen, so it stays put when the page resizes. Without a
 * title bar to hold onto, the whole element stays on screen.
 */
export function useDrag(
  screen: RefObject<HTMLElement | null>,
  window: RefObject<HTMLElement | null>,
  onEnd?: (at: { x: number; y: number }) => void,
  onMove?: () => void,
) {
  return useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const node = window.current;
      const bounds = screen.current;
      const handle = event.currentTarget;
      delete handle.dataset.dragged;
      if (event.button !== 0 || !node || !bounds) return;
      if ((event.target as HTMLElement).closest("button")) return;
      handle.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startY = event.clientY;
      const left = node.offsetLeft;
      const top = node.offsetTop;
      const titlebar = node.querySelector<HTMLElement>("[data-grip]");
      const grip = titlebar?.offsetHeight ?? node.offsetHeight;
      const overhang = titlebar ? 0.75 : 0;
      let at = { x: left / bounds.clientWidth, y: top / bounds.clientHeight };

      const move = (next: globalThis.PointerEvent) => {
        const dx = next.clientX - startX;
        const dy = next.clientY - startY;
        if (handle.dataset.dragged === undefined && Math.hypot(dx, dy) < 4)
          return;
        handle.dataset.dragged = "";
        const width = bounds.clientWidth;
        const height = bounds.clientHeight;
        const x = within(
          left + dx,
          -node.offsetWidth * overhang,
          width - node.offsetWidth * (1 - overhang),
        );
        const y = within(top + dy, 0, height - grip);
        at = { x: x / width, y: y / height };
        node.style.left = `${at.x * 100}%`;
        node.style.top = `${at.y * 100}%`;
        onMove?.();
      };
      const end = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
        onEnd?.(at);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    },
    [screen, window, onEnd, onMove],
  );
}

const within = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const ROWS = [72, 56, 64, 48, 60];
const LINES = [88, 64, 76, 52];

/** A placeholder window: a title bar, a sidebar and some lines. */
export function AppWindow({ lights }: { lights: ReactNode }) {
  return (
    <>
      <div className={styles.titlebar} data-grip>
        {lights}
      </div>
      <div className={styles.body}>
        <div className={styles.sidebar}>
          {ROWS.map((width, index) => (
            <span
              key={width}
              data-selected={index === 1 || undefined}
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div className={styles.content}>
          <span className={styles.hero} />
          {LINES.map((width) => (
            <span key={width} style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    </>
  );
}
