// A static copy of the window to draw from, with the popup's own transition
// state stripped so exit styles don't apply to it.
export function cloneWindow(
  source: HTMLElement,
  width: number,
  height: number,
) {
  const copy = source.cloneNode(true) as HTMLElement;
  for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
    node.removeAttribute("id");
    node.removeAttribute("data-starting-style");
    node.removeAttribute("data-ending-style");
  }
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
  const style = copy.style;
  style.setProperty("position", "absolute");
  style.setProperty("inset", "auto");
  style.setProperty("left", "0");
  style.setProperty("top", "0");
  style.setProperty("margin", "0");
  style.setProperty("box-sizing", "border-box");
  style.setProperty("width", `${width}px`);
  style.setProperty("height", `${height}px`);
  style.setProperty("transform", "none");
  style.setProperty("translate", "none");
  style.setProperty("scale", "none");
  style.setProperty("rotate", "none");
  style.setProperty("transition", "none");
  style.setProperty("animation", "none");
  style.setProperty("opacity", "1");
  style.setProperty("visibility", "visible");
  style.setProperty("pointer-events", "none");
  return copy;
}
