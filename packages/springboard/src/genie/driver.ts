import {
  createGenie,
  type GenieLayer,
  type GenieLayerOptions,
  IN_FLIGHT,
} from "./genie.ts";

// Plays a Genie linearly between two progress values, or holds it at one.
// The layer is created on first use and again after reset(), so nothing is
// cloned until the window actually moves.
export function createDriver(
  options: () => GenieLayerOptions | null,
  onChange: (progress: number) => void,
) {
  let genie: GenieLayer | null = null;
  let progress = 0;
  let frame = 0;
  let run = 0;

  const ensure = () => {
    if (genie) return genie;
    const resolved = options();
    genie = resolved ? createGenie(resolved) : null;
    return genie;
  };

  const show = (value: number) => {
    progress = value;
    if (value > 0) ensure()?.draw(value);
    else genie?.draw(0);
    onChange(value);
  };

  return {
    get progress() {
      return progress;
    },
    get genie() {
      return genie;
    },
    set(value: number) {
      run++;
      cancelAnimationFrame(frame);
      show(value);
    },
    /** Moves to `to` at the Dock's constant rate: `seconds` for the full range. */
    play(to: number, seconds: number) {
      const id = ++run;
      cancelAnimationFrame(frame);
      const from = progress;
      const length = Math.abs(to - from) * seconds * 1000;
      const current = ensure();
      if (!current || length === 0) return show(to);
      // Draw the first frame now, so the window never shows a state change
      // made by the same click before the mesh takes over.
      const start = performance.now();
      const tick = (now: number) => {
        if (id !== run) return;
        const t = Math.min(Math.max(now - start, 0) / length, 1);
        const value = from + (to - from) * t;
        show(t < 1 ? Math.max(value, IN_FLIGHT) : value);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      tick(start);
    },
    /** Drops the layer so the next frame re-measures. */
    reset() {
      genie?.dispose();
      genie = null;
      if (progress > 0) ensure()?.draw(progress);
    },
    dispose() {
      run++;
      cancelAnimationFrame(frame);
      genie?.dispose();
      genie = null;
    },
  };
}
