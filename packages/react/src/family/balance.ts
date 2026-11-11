import { timing } from "../internal/glyphs/timing.ts";
import type {
  ContentTransition,
  Update,
} from "../internal/glyphs/transition.ts";
import { measured } from "./measured.ts";

/**
 * Family's wheels show a digit whole from its cap height to its baseline and
 * fade its neighbours out over 0.4em beyond that, past the line box.
 */
const WHEEL =
  "linear-gradient(to bottom, transparent, #000 0.4em, #000 calc(100% - 0.4em), transparent)";

/**
 * Spins a digit's wheel straight from one digit to the other, whichever way
 * the number moves, with the higher digits on top.
 */
function wheel(el: HTMLElement, from: string, to: string) {
  const a = Number(from);
  const b = Number(to);
  if (Number.isNaN(a) || Number.isNaN(b) || a === b) return;
  const direction = Math.sign(b - a);
  const digits = Array.from({ length: Math.abs(b - a) + 1 }, (_, i) =>
    String(a + direction * i),
  );
  if (direction > 0) digits.reverse();

  const inner = el.firstElementChild as HTMLElement;
  const height = el.offsetHeight;
  const strip = document.createElement("span");
  Object.assign(strip.style, {
    position: "absolute",
    insetInline: "0",
    top: "0.15em",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  });
  for (const digit of digits) {
    const cell = document.createElement("span");
    cell.textContent = digit;
    cell.style.height = `${height}px`;
    strip.append(cell);
  }
  Object.assign(el.style, {
    padding: "0.15em",
    margin: "-0.15em",
    maskImage: WHEEL,
    webkitMaskImage: WHEEL,
  });
  inner.style.opacity = "0";
  el.append(strip);

  const travel = (digits.length - 1) * height;
  return strip.animate(
    {
      transform:
        direction > 0
          ? [`translateY(${-travel}px)`, "translateY(0)"]
          : ["translateY(0)", `translateY(${-travel}px)`],
    },
    { ...timing(measured.wheel), fill: "both" },
  );
}

/** Spins a kept glyph's wheel, then puts the glyph back as it was. */
function roll(update: Update, el: HTMLElement, from: string, to: string) {
  const animation = wheel(el, from, to);
  if (!animation) return;
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    animation.cancel();
    el.lastElementChild?.remove();
    (el.firstElementChild as HTMLElement).style.opacity = "";
    Object.assign(el.style, {
      padding: "",
      margin: "",
      maskImage: "",
      webkitMaskImage: "",
    });
  };
  update.onInterrupt(settle);
  animation.finished.then(settle, () => {});
}

/**
 * Family's wallet. Characters both labels share slide into place, the rest
 * fade, and digits spin on wheels to their new value.
 */
export const balance = {
  targets: { number: true },
  layout: measured.layout,
  hold: true,
  plan: (update) => ({
    keep(el, part, old) {
      if (old.char === part.char) return false;
      if (old.role !== "digit" || part.role !== "digit") return false;
      roll(update, el, old.char, part.char);
      return true;
    },
    enter(el, part, delay, added) {
      el.animate({ opacity: [0, 1] }, timing(update.layout, delay));
      if (added && part.role === "digit") roll(update, el, "0", part.char);
    },
    leave(clone, part, delay, removed) {
      const fade = clone.animate(
        { opacity: 0 },
        { ...timing(update.layout, delay), fill: "both" },
      );
      const spin =
        removed && part.role === "digit"
          ? wheel(clone, part.char, "0")
          : undefined;
      return spin ? [fade, spin] : [fade];
    },
  }),
} as const satisfies ContentTransition;
