import type { Mesh } from "./mesh.ts";

const SVG = "http://www.w3.org/2000/svg";
const ARC_STEPS = 6;

type Shadow = {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
};

// The window's box-shadow, drawn once under the slices as the outline of the
// warped window. Clipping the shadow into every strip would seam it.
export function createShadow(
  layer: HTMLElement,
  source: HTMLElement,
  width: number,
  height: number,
) {
  const style = getComputedStyle(source);
  const shadows = parseShadows(style.boxShadow);
  const radii = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map((r) => Math.min(Number.parseFloat(r) || 0, width / 2, height / 2));

  // A box-shadow only paints outside the border box. Without the hole, the
  // fill and ring show through the window's antialiased edges as a dark seam.
  const group = document.createElement("div");
  Object.assign(group.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
  });
  if (shadows.length > 0) layer.append(group);

  // Box-shadows paint first-listed on top, so append them in reverse.
  const paths = shadows.toReversed().map((shadow) => {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("aria-hidden", "true");
    Object.assign(svg.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      overflow: "visible",
      pointerEvents: "none",
    });
    const path = document.createElementNS(SVG, "path");
    // A spread with no blur is a ring, so stroke it. The hole clips the
    // inner half.
    if (shadow.blur === 0) {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", shadow.color);
    } else {
      path.setAttribute("fill", shadow.color);
    }
    svg.append(path);
    group.append(svg);
    return { svg, path, shadow };
  });

  return {
    draw(mesh: Mesh) {
      if (paths.length === 0) return;
      const outline = warpedOutline(mesh, width, height, radii);
      // The shadow is part of the window's surface, so it shrinks with it.
      const k = Math.min(1, Math.sqrt(area(outline) / (width * height)));
      let d = "";
      for (let i = 0; i < outline.length; i += 2)
        d += `${i ? "L" : "M"}${outline[i].toFixed(2)} ${outline[i + 1].toFixed(2)}`;
      d += "Z";
      group.style.clipPath = `path(evenodd, "M-99999 -99999H99999V99999H-99999Z${d}")`;

      for (const { svg, path, shadow } of paths) {
        path.setAttribute("d", d);
        svg.style.translate = `${shadow.x * k}px ${shadow.y * k}px`;
        if (shadow.blur === 0) {
          path.setAttribute("stroke-width", `${shadow.spread * 2 * k}`);
        } else {
          // blur's length is the standard deviation, which is half a
          // box-shadow's blur radius.
          svg.style.filter = `blur(${(shadow.blur / 2) * k}px)`;
        }
      }
    },
    dispose() {
      group.remove();
    },
  };
}

function parseShadows(value: string): Shadow[] {
  if (!value || value === "none") return [];
  const shadows: Shadow[] = [];
  for (const part of value.split(/,(?![^(]*\))/)) {
    if (part.includes("inset")) continue;
    const color = part.match(/[a-z-]+\([^)]*\)|#[\da-f]+/i)?.[0] ?? "#000";
    const lengths = part.replace(color, "").match(/-?[\d.]+(?=px)/g) ?? [];
    const [x = 0, y = 0, blur = 0, spread = 0] = lengths.map(Number);
    if (blur === 0 && spread <= 0) continue;
    shadows.push({ x, y, blur, spread, color });
  }
  return shadows;
}

// The window's rounded outline in its own pixels, carried through the mesh.
function warpedOutline(
  mesh: Mesh,
  width: number,
  height: number,
  [tl, tr, br, bl]: number[],
) {
  const { columns, points } = mesh;
  const across = columns === 2;
  const at = (c: number, r: number) => (r * columns + c) * 4;
  const count = across ? mesh.rows : columns;
  const key = (i: number) => (across ? points[at(0, i) + 1] : points[at(i, 0)]);

  const map = (u: number, v: number, out: number[]) => {
    const along = across ? v : u;
    let i = 0;
    while (i < count - 2 && key(i + 1) < along) i++;
    const span = key(i + 1) - key(i);
    const t = span > 0 ? clamp((along - key(i)) / span) : 0;
    const s = clamp(across ? u / width : v / height);
    const a = across ? at(0, i) : at(i, 0);
    const b = across ? at(1, i) : at(i, 1);
    const c = across ? at(0, i + 1) : at(i + 1, 0);
    const e = across ? at(1, i + 1) : at(i + 1, 1);
    for (const axis of [2, 3]) {
      const near = points[a + axis] + (points[b + axis] - points[a + axis]) * s;
      const far = points[c + axis] + (points[e + axis] - points[c + axis]) * s;
      out.push(near + (far - near) * t);
    }
  };

  const out: number[] = [];
  const arc = (cx: number, cy: number, r: number, from: number) => {
    for (let n = 0; n <= ARC_STEPS; n++) {
      const angle = from + (n / ARC_STEPS) * (Math.PI / 2);
      map(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, out);
    }
  };
  // Mesh lines between two corners, so straight edges follow the funnel.
  const edge = (from: number, to: number, fixed: number, alongU: boolean) => {
    if (alongU === across) return;
    const step = from < to ? 1 : -1;
    const keys = Array.from({ length: count }, (_, i) => key(i));
    if (step < 0) keys.reverse();
    for (const k of keys)
      if ((k - from) * step > 0 && (to - k) * step > 0)
        alongU ? map(k, fixed, out) : map(fixed, k, out);
  };

  arc(tl, tl, tl, Math.PI);
  edge(tl, width - tr, 0, true);
  arc(width - tr, tr, tr, -Math.PI / 2);
  edge(tr, height - br, width, false);
  arc(width - br, height - br, br, 0);
  edge(width - br, bl, height, true);
  arc(bl, height - bl, bl, Math.PI / 2);
  edge(height - bl, tl, 0, false);
  return out;
}

function area(outline: number[]) {
  let sum = 0;
  const n = outline.length;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 2) % n;
    sum += outline[i] * outline[j + 1] - outline[j] * outline[i + 1];
  }
  return Math.abs(sum) / 2;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
