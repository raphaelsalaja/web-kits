import type { CSSProperties } from "react";
import type { Part } from "../internal/glyphs/parts.ts";
import { timing } from "../internal/glyphs/timing.ts";
import type { ContentTransition } from "../internal/glyphs/transition.ts";
import { measured } from "./measured.ts";

/**
 * Family's keypad fades digits out over the bottom 0.1em of a 1.2 line, and
 * over 0.1em just past the top of the line. The sides are padded so glyphs
 * sliding in from the old width stay unmasked.
 */
const WINDOW =
  "linear-gradient(to bottom, transparent 0.23em, #000 0.34em, #000 calc(100% - 0.1em), transparent)";

const STYLE: CSSProperties = {
  lineHeight: 1.2,
  padding: "0.3em 1.5em 0",
  margin: "-0.3em -1.5em 0",
  maskImage: WINDOW,
  WebkitMaskImage: WINDOW,
};

/** How many digits come before each part that isn't one. */
function digitsAhead(parts: readonly Part[]) {
  const out = new Map<string, number>();
  let count = 0;
  for (const part of parts) {
    if (part.role === "digit") count++;
    else out.set(part.key, count);
  }
  return out;
}

/**
 * A separator that ends up between other digits drops out of the window and
 * rises back in while it slides across.
 */
function rejoin(el: HTMLElement) {
  const { enter, exit, enterOffset, exitOffset, rejoin } = measured.input;
  el.animate(
    { transform: ["none", `translateY(${exitOffset}cap)`] },
    timing(exit),
  );
  el.animate(
    { transform: [`translateY(${enterOffset}cap)`, "none"] },
    { ...timing(enter, rejoin), fill: "none" },
  );
}

/**
 * Family's keypad. New digits rise as the others slide over, deleted ones
 * fall away, and the width changes at once. Digits come in from above when
 * there are fewer of them.
 */
export const keypad = {
  targets: { number: true },
  layout: measured.input.slide,
  typing: true,
  snapWidth: true,
  style: () => STYLE,
  plan: ({ previous, parts, after, seen, direction }) => {
    const { input } = measured;
    const ahead = digitsAhead(parts);
    const aheadBefore = digitsAhead(previous);
    // A digit only leaves on its own when it's deleted. When another comes in
    // with it, as with the 0 shown before typing, it's pushed out.
    const pushed = parts.some(
      (part) => part.role === "digit" && !seen.has(part.key),
    );
    // One digit replacing another, as when the first is typed over the 0.
    const swapped =
      pushed &&
      previous.filter((part) => part.role === "digit" && !after.has(part.key))
        .length === 1;
    const push = swapped ? input.push : input.enter;

    return {
      keep(el, part) {
        if (
          part.role === "group" &&
          ahead.get(part.key) !== aheadBefore.get(part.key)
        ) {
          rejoin(el);
        }
        return false;
      },
      enter(el, part, delay) {
        const digit = part.role === "digit";
        el.animate(
          {
            transform: [
              `translateY(${(digit ? direction : 1) * input.enterOffset}cap)`,
              "none",
            ],
          },
          timing(digit ? push : input.enter, delay),
        );
      },
      leave(clone, part, delay, removed) {
        const digit = part.role === "digit";
        // A digit typed over another pushes it out the way it came in.
        if (digit && (!removed || pushed)) {
          return [
            clone.animate(
              { transform: `translateY(${-direction * input.pushOffset}cap)` },
              { ...timing(push, delay), fill: "both" },
            ),
          ];
        }
        return [
          clone.animate(
            {
              transform: `translateY(${(digit ? -direction : 1) * input.exitOffset}cap)`,
            },
            { ...timing(input.exit, delay), fill: "both" },
          ),
        ];
      },
    };
  },
} as const satisfies ContentTransition;
