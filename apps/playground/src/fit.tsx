import { type Spring, toLinear } from "@web-kits/react/springs";
import { type ReactNode, useLayoutEffect, useRef } from "react";

/**
 * Scales a line of glyphs down to `width` points, the way SwiftUI's
 * `minimumScaleFactor` shrinks Family's amount once it gets too long.
 */
export function Fit({
  width,
  spring,
  children,
}: {
  width: number;
  spring: Spring;
  children: ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const running = useRef<Animation | null>(null);
  const target = useRef(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const glyphs = el.querySelectorAll<HTMLElement>("[data-glyph]");
    const first = glyphs[0];
    const last = glyphs[glyphs.length - 1];
    const natural =
      first && last ? last.offsetLeft + last.offsetWidth - first.offsetLeft : 0;
    const next = width > 0 && natural > width ? width / natural : 1;
    if (Math.abs(next - target.current) < 1e-4) return;
    target.current = next;
    const from = Number.parseFloat(getComputedStyle(el).scale) || 1;
    running.current?.cancel();
    el.style.scale = String(next);
    running.current = el.animate(
      { scale: [String(from), String(next)] },
      { ...toLinear(spring), fill: "backwards" },
    );
  });

  if (width <= 0) return children;
  return (
    <span
      ref={ref}
      // Family shrinks its amount about a point a little above the line's middle.
      style={{
        display: "inline-block",
        transformOrigin: "50% calc(50% - 0.04em)",
      }}
    >
      {children}
    </span>
  );
}
