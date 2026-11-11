const SVG = "http://www.w3.org/2000/svg";
const LINES = "rgb(0 122 255 / 0.7)";
const VERTICES = "rgb(255 149 0)";
const RADIUS = 2.5;

export type Point = { x: number; y: number };

// The mesh drawn over an effect: the pieces it's cut into as lines, and the
// vertices that move them as dots. It sits on its own layer, so the effect's
// fade, blur and mask leave it alone.
export function createOverlay(bounds: HTMLElement | null) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-springboard-debug", "");
  Object.assign(svg.style, {
    position: bounds ? "absolute" : "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
    pointerEvents: "none",
    zIndex: bounds ? "auto" : "2147483647",
  });
  const path = (attributes: Record<string, string>) => {
    const element = document.createElementNS(SVG, "path");
    for (const [name, value] of Object.entries(attributes))
      element.setAttribute(name, value);
    svg.append(element);
    return element;
  };
  const lines = path({ fill: "none", stroke: LINES, "stroke-width": "1" });
  const dots = path({ fill: VERTICES });
  (bounds ?? document.body).append(svg);

  return {
    draw(through: readonly (readonly Point[])[], vertices: readonly Point[]) {
      lines.setAttribute(
        "d",
        through
          .map((line) =>
            line
              .map(
                ({ x, y }, i) =>
                  `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`,
              )
              .join(""),
          )
          .join(""),
      );
      dots.setAttribute(
        "d",
        vertices
          .map(
            ({ x, y }) =>
              `M${(x - RADIUS).toFixed(1)} ${y.toFixed(1)}a${RADIUS} ${RADIUS} 0 1 0 ${RADIUS * 2} 0a${RADIUS} ${RADIUS} 0 1 0 ${-RADIUS * 2} 0`,
          )
          .join(""),
      );
    },
    clear() {
      lines.removeAttribute("d");
      dots.removeAttribute("d");
    },
    dispose() {
      svg.remove();
    },
  };
}

export type Overlay = ReturnType<typeof createOverlay>;

/** The lines across and down a grid of points, `columns + 1` to a row. */
export function gridLines(points: readonly Point[], columns: number) {
  const rows = points.length / (columns + 1);
  const at = (c: number, r: number) => points[r * (columns + 1) + c];
  const lines: Point[][] = [];
  for (let r = 0; r < rows; r++)
    lines.push(Array.from({ length: columns + 1 }, (_, c) => at(c, r)));
  for (let c = 0; c <= columns; c++)
    lines.push(Array.from({ length: rows }, (_, r) => at(c, r)));
  return lines;
}
