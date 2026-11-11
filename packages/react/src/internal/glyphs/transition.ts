import type { CSSProperties } from "react";
import type { Spring } from "../../animation/spring.ts";
import type { Part } from "./parts.ts";

/** A glyph as it was on screen before the update, in the root's own pixels. */
export type Seen = {
  center: number;
  width: number;
  top: number;
  char: string;
  opacity: string;
  transform: string;
  scale: string;
  filter: string;
};

/** One change of the label, as a transition's plan sees it. */
export type Update = {
  readonly previous: readonly Part[];
  readonly parts: readonly Part[];
  /** Keys of the parts after the change. */
  readonly after: ReadonlySet<string>;
  /** The glyphs on screen before the change, by key. */
  readonly seen: ReadonlyMap<string, Seen>;
  /** 1 brings new glyphs in from below, -1 from above. */
  readonly direction: 1 | -1;
  /** What the width, kept glyphs and crossfades follow. */
  readonly layout: Spring;
  /** Runs when the next change interrupts this one. */
  onInterrupt(settle: () => void): void;
};

/** What one change does to the glyphs it keeps, brings in and takes away. */
export type Plan = {
  /** A glyph that stays. Return true when it has handled a changed character. */
  keep?(el: HTMLElement, part: Part, old: Part): boolean | undefined;
  /** A glyph that comes in, or whose character changed. */
  enter?(el: HTMLElement, part: Part, delay: number, added: boolean): void;
  /** A copy of a glyph that goes, or whose character changed. */
  leave?(
    clone: HTMLElement,
    part: Part,
    delay: number,
    removed: boolean,
  ): Animation[];
};

/**
 * How a label changes, like SwiftUI's `ContentTransition`. Pass one to
 * `TextTransition` or `NumberTransition`.
 */
export type ContentTransition = {
  /** Which components it works on. */
  readonly targets: { readonly text?: true; readonly number?: true };
  /** What the width, kept glyphs and crossfades follow by default. */
  readonly layout?: Spring;
  /** For numbers: which way new digits come in. Left out, by the value. */
  readonly countsDown?: boolean;
  /** For numbers: keys digits as they're typed rather than by place. */
  readonly typing?: boolean;
  /** Changes the whole label at once instead of glyph by glyph. */
  readonly whole?: "crossfade" | "swap";
  /** Takes the new width at once instead of animating to it. */
  readonly snapWidth?: boolean;
  /** Holds glyphs that come and go still on screen while the width moves. */
  readonly hold?: boolean;
  /** Seconds the changed glyphs start across, left to right. */
  readonly stagger?: number;
  /** Style for the root. */
  style?(layout: Spring): CSSProperties | undefined;
  /** Plans one change. Left out, new glyphs fade in and old ones fade out. */
  plan?(update: Update): Plan;
};

export type TextContentTransition = ContentTransition & {
  readonly targets: { readonly text: true };
};

export type NumberContentTransition = ContentTransition & {
  readonly targets: { readonly number: true };
};
