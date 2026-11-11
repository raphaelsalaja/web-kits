import {
  NumberTransition,
  type NumberTransitionKind,
} from "@web-kits/react/number-transition";
import { type Spring, spring } from "@web-kits/react/springs";
import {
  TextTransition,
  type TextTransitionKind,
} from "@web-kits/react/text-transition";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  family,
  animations as presets,
} from "../../../packages/react/src/internal/presets.ts";
import { Curves } from "./curves.tsx";
import { Fit } from "./fit.tsx";
import { FPS, ReferenceVideo } from "./reference.tsx";
import {
  type AnimationChoice,
  FONTS,
  type Font,
  SCENARIOS,
  type Scenario,
  type Step,
} from "./scenarios.ts";

const NUMBER: NumberTransitionKind[] = [
  "numericText",
  "family",
  "family-input",
  "opacity",
  "interpolate",
  "identity",
];
const TEXT: TextTransitionKind[] = [
  "opacity",
  "interpolate",
  "identity",
  "numericText",
  "family",
];
type Settings = {
  transition: string;
  animation: AnimationChoice;
  response: number;
  damping: number;
  direction: "auto" | "up" | "down";
  size: number;
  weight: number;
  font: Font;
  fit: number;
  theme: "light" | "dark";
  layers: boolean;
  boxes: boolean;
  speed: number;
  stepping: boolean;
  offset: number;
  zoom: boolean;
  scale: number;
  format: Intl.NumberFormatOptions;
  locales: string;
};

function defaults(scenario: Scenario): Settings {
  return {
    transition: scenario.transition,
    animation: scenario.spring ? "custom" : (scenario.animation ?? "default"),
    response: scenario.spring?.response ?? 0.5,
    damping: scenario.spring?.dampingRatio ?? 1,
    direction:
      scenario.countsDown === undefined
        ? "auto"
        : scenario.countsDown
          ? "down"
          : "up",
    size: scenario.size,
    weight: scenario.weight,
    font: scenario.font ?? "System",
    fit: scenario.fit ?? 0,
    theme: scenario.theme,
    layers: scenario.layers ?? false,
    boxes: false,
    speed: 1,
    stepping: false,
    offset: 0,
    zoom: true,
    scale: 1,
    format: scenario.format ?? {},
    locales: scenario.locales ?? "en-US",
  };
}

function layoutSpring(settings: Settings): Spring {
  if (settings.animation === "custom")
    return spring(settings.response, settings.damping);
  if (settings.animation !== "default") return presets[settings.animation];
  if (settings.transition === "family") return family.layout;
  if (settings.transition === "family-input") return family.input.slide;
  return presets.smooth;
}

let ids = 0;

type Item = Step & { id: number };

const numbered = (steps: Step[]): Item[] =>
  steps.map((step) => ({ ...step, id: ids++ }));

type Row = {
  id: number;
  target: string;
  properties: string;
  delay: number;
  duration: number;
  easing: string;
};

function describe(animation: Animation): Row | null {
  const effect = animation.effect as KeyframeEffect | null;
  if (!effect) return null;
  const timing = effect.getTiming();
  const frames = effect.getKeyframes();
  const properties = new Set<string>();
  for (const frame of frames) {
    for (const key of Object.keys(frame)) {
      if (!["offset", "easing", "composite", "computedOffset"].includes(key))
        properties.add(key);
    }
  }
  const target = effect.target as HTMLElement | null;
  const where = target?.dataset.glyph
    ? `glyph ${target.dataset.glyph}`
    : target?.parentElement?.dataset.glyph
      ? "wheel strip"
      : target?.style.position === "absolute"
        ? "leaving"
        : "root";
  return {
    id: ids++,
    target: `${where} “${target?.textContent?.slice(0, 12) ?? ""}”`,
    properties: [...properties]
      .map((p) => `${p}: ${frames.map((f) => String(f[p] ?? "·")).join(" → ")}`)
      .join("; "),
    delay: Number(timing.delay ?? 0),
    duration: Number(timing.duration ?? 0),
    easing: String(timing.easing ?? ""),
  };
}

export function App() {
  const [id, setId] = useState(() => location.hash.slice(1) || SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
  const [settings, setSettings] = useState(() => defaults(scenario));
  const [steps, setSteps] = useState(() => numbered(scenario.steps));
  const [step, setStep] = useState(0);
  const [time, setTime] = useState(0);
  const [end, setEnd] = useState(1000);
  const [rows, setRows] = useState<Row[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const running = useRef<Animation[]>([]);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  useEffect(() => {
    location.hash = scenario.id;
    setSettings(defaults(scenario));
    setSteps(numbered(scenario.steps));
    setStep(0);
    setTime(0);
    setRows([]);
    running.current = [];
    const v = video.current;
    const first = scenario.steps.find((s) => s.at !== undefined)?.at;
    if (v && first !== undefined) {
      v.pause();
      v.currentTime = Math.max(first - 0.3, 0);
    }
  }, [scenario]);

  const layout = layoutSpring(settings);
  const countsDown =
    settings.direction === "auto" ? undefined : settings.direction === "down";

  function collect(paused: boolean) {
    const found = (
      stage.current?.getAnimations({ subtree: true }) ?? []
    ).filter((a) => a.playState !== "finished");
    for (const a of found) {
      a.playbackRate = settings.speed;
      if (paused) {
        a.pause();
        a.currentTime = 0;
      }
    }
    running.current = found;
    setEnd(
      Math.max(
        400,
        ...found.map((a) => {
          const t = a.effect?.getComputedTiming();
          return Number(t?.endTime ?? 0);
        }),
      ),
    );
    setRows(found.map(describe).filter((r): r is Row => r !== null));
    setTime(0);
  }

  function instant(index: number) {
    flushSync(() => setStep(index));
    for (const a of stage.current?.getAnimations({ subtree: true }) ?? [])
      a.finish();
  }

  function seekVideo(index: number, t: number) {
    const at = steps[index]?.at;
    const v = video.current;
    if (!v || at === undefined) return;
    v.pause();
    v.currentTime = Math.max(at + settings.offset / 1000 + t / 1000, 0);
  }

  function go(index: number) {
    if (index < 0 || index >= steps.length) return;
    const at = steps[index].at;
    const v = video.current;
    if (settings.stepping || !v || at === undefined) {
      for (const a of running.current) if (a.playState === "paused") a.finish();
      flushSync(() => setStep(index));
      collect(settings.stepping);
      seekVideo(index, 0);
      return;
    }
    const target = at + settings.offset / 1000;
    v.playbackRate = Math.max(settings.speed, 0.0625);
    v.currentTime = Math.max(target - 0.25, 0);
    const fire = () => {
      flushSync(() => setStep(index));
      collect(false);
    };
    v.play().then(() => {
      const wait: VideoFrameRequestCallback = (_, meta) => {
        if (meta.mediaTime >= target) fire();
        else v.requestVideoFrameCallback(wait);
      };
      v.requestVideoFrameCallback(wait);
    });
  }

  function replay() {
    if (step === 0) return;
    instant(step - 1);
    go(step);
  }

  function scrub(t: number) {
    const clamped = Math.min(Math.max(t, 0), end);
    setTime(clamped);
    for (const a of running.current) {
      a.pause();
      a.currentTime = clamped;
    }
    seekVideo(step, clamped);
  }

  const api = useRef({ go, instant, scrub, set, setId, scenario, steps });
  api.current = { go, instant, scrub, set, setId, scenario, steps };
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    Object.assign(window, {
      playground: {
        scenario: () => ({ ...api.current.scenario, steps: api.current.steps }),
        open: (id: string) => api.current.setId(id),
        settle: (index: number) => api.current.instant(index),
        start: (index: number) => api.current.go(index),
        seek: (ms: number) => api.current.scrub(ms),
        set: <K extends keyof Settings>(key: K, value: Settings[K]) =>
          api.current.set(key, value),
      },
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") scrub(time + 1000 / FPS);
      else if (e.key === "ArrowLeft") scrub(time - 1000 / FPS);
      else if (e.key === " ") {
        e.preventDefault();
        go(step + 1 < steps.length ? step + 1 : 0);
      } else if (e.key === "r") replay();
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const groups = useMemo(() => {
    const map = new Map<string, Scenario[]>();
    for (const s of SCENARIOS)
      map.set(s.group, [...(map.get(s.group) ?? []), s]);
    return [...map];
  }, []);

  const current = steps[step] ?? steps[0];
  const options = scenario.component === "number" ? NUMBER : TEXT;
  const crop = scenario.reference?.crop;
  const points = scenario.reference?.scale ?? 3;
  const componentKey = `${scenario.id}-${settings.transition}-${settings.locales}-${JSON.stringify(settings.format)}`;
  const shared = {
    animation: layout,
    countsDown,
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <h1>Transitions</h1>
        {groups.map(([group, list]) => (
          <section key={group}>
            <h2>{group}</h2>
            {list.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={s.id === scenario.id}
                onClick={() => setId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </section>
        ))}
      </nav>

      <main>
        <header>
          <div>
            <h2>{scenario.name}</h2>
            {scenario.notes && <p className="notes">{scenario.notes}</p>}
          </div>
          <p className="keys">Space next step · R replay · ← → one frame</p>
        </header>

        <div className="panes">
          {scenario.reference ? (
            <ReferenceVideo
              key={scenario.reference.src}
              reference={scenario.reference}
              video={video}
              zoom={settings.zoom}
              scale={settings.scale}
            />
          ) : (
            <div className="reference empty">
              No reference clip for free play.
            </div>
          )}
          <div
            ref={stage}
            className={[
              "stage",
              settings.theme,
              crop ? "sized" : "",
              scenario.className ?? "",
              settings.layers ? "layers" : "",
              settings.boxes ? "boxes" : "",
            ].join(" ")}
            style={{
              fontSize: settings.size,
              fontWeight: settings.weight,
              fontFamily: FONTS[settings.font],
              letterSpacing: scenario.tracking && `${scenario.tracking}em`,
              width: crop && crop.w / points,
              height: crop && crop.h / points,
              zoom: settings.scale,
            }}
          >
            <Fit width={settings.fit} spring={family.input.slide}>
              {scenario.component === "number" ? (
                <NumberTransition
                  key={componentKey}
                  value={current.value ?? 0}
                  format={settings.format}
                  locales={settings.locales}
                  transition={settings.transition as NumberTransitionKind}
                  {...shared}
                />
              ) : (
                <TextTransition
                  key={componentKey}
                  transition={settings.transition as TextTransitionKind}
                  {...shared}
                >
                  {current.text ?? ""}
                </TextTransition>
              )}
            </Fit>
          </div>
        </div>

        <div className="timeline">
          <button
            type="button"
            onClick={() => go(step - 1)}
            disabled={step === 0}
          >
            Previous
          </button>
          <button type="button" onClick={replay} disabled={step === 0}>
            Replay
          </button>
          <button
            type="button"
            onClick={() => go(step + 1)}
            disabled={step >= steps.length - 1}
          >
            Next
          </button>
          <button type="button" onClick={() => scrub(time - 1000 / FPS)}>
            −1 Frame
          </button>
          <input
            type="range"
            min={0}
            max={end}
            step={1}
            value={time}
            onChange={(e) => scrub(Number(e.target.value))}
            aria-label="Time"
          />
          <button type="button" onClick={() => scrub(time + 1000 / FPS)}>
            +1 Frame
          </button>
          <output>
            {Math.round(time)} ms · frame {Math.round((time / 1000) * FPS)}
          </output>
        </div>

        <div className="columns">
          <section className="panel">
            <h3>Settings</h3>
            <label>
              Transition
              <select
                value={settings.transition}
                onChange={(e) => set("transition", e.target.value)}
              >
                {options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label>
              Animation
              <select
                value={settings.animation}
                onChange={(e) =>
                  set("animation", e.target.value as AnimationChoice)
                }
              >
                {["default", "smooth", "snappy", "bouncy", "custom"].map(
                  (o) => (
                    <option key={o}>{o}</option>
                  ),
                )}
              </select>
            </label>
            {settings.animation === "custom" && (
              <>
                <Slider
                  label="Response"
                  value={settings.response}
                  min={0.05}
                  max={1.5}
                  step={0.005}
                  unit="s"
                  onChange={(v) => set("response", v)}
                />
                <Slider
                  label="Damping"
                  value={settings.damping}
                  min={0.1}
                  max={2.5}
                  step={0.01}
                  onChange={(v) => set("damping", v)}
                />
              </>
            )}
            <label>
              Direction
              <select
                value={settings.direction}
                onChange={(e) =>
                  set("direction", e.target.value as Settings["direction"])
                }
              >
                <option value="auto">By value</option>
                <option value="up">Up</option>
                <option value="down">Down (countsDown)</option>
              </select>
            </label>
            <Slider
              label="Size"
              value={settings.size}
              min={10}
              max={220}
              step={1}
              unit="px"
              onChange={(v) => set("size", v)}
            />
            <Slider
              label="Weight"
              value={settings.weight}
              min={100}
              max={900}
              step={100}
              onChange={(v) => set("weight", v)}
            />
            <label>
              Font
              <select
                value={settings.font}
                onChange={(e) => set("font", e.target.value as Font)}
              >
                {Object.keys(FONTS).map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <Slider
              label="Fit width (0 is off)"
              value={settings.fit}
              min={0}
              max={600}
              step={1}
              unit="pt"
              onChange={(v) => set("fit", v)}
            />
            <label>
              Pane scale
              <select
                value={settings.scale}
                onChange={(e) => set("scale", Number(e.target.value))}
              >
                {[1, 1.5, 2].map((o) => (
                  <option key={o} value={o}>
                    {o}× points
                  </option>
                ))}
              </select>
            </label>
            <label>
              Theme
              <select
                value={settings.theme}
                onChange={(e) =>
                  set("theme", e.target.value as Settings["theme"])
                }
              >
                <option>light</option>
                <option>dark</option>
              </select>
            </label>
            <Toggle
              label="Colour layers (leaving red, arriving blue)"
              value={settings.layers}
              onChange={(v) => set("layers", v)}
            />
            <Toggle
              label="Outline glyph boxes"
              value={settings.boxes}
              onChange={(v) => set("boxes", v)}
            />
            <Toggle
              label="Zoom the reference"
              value={settings.zoom}
              onChange={(v) => set("zoom", v)}
            />
            <h3>Playback</h3>
            <Slider
              label="Speed"
              value={settings.speed}
              min={0.05}
              max={1}
              step={0.05}
              unit="×"
              onChange={(v) => set("speed", v)}
            />
            <Toggle
              label="Step mode (start paused, scrub both)"
              value={settings.stepping}
              onChange={(v) => set("stepping", v)}
            />
            <Slider
              label="Reference offset"
              value={settings.offset}
              min={-500}
              max={500}
              step={1}
              unit="ms"
              onChange={(v) => set("offset", v)}
            />
            {scenario.component === "number" && (
              <>
                <h3>Format</h3>
                <label>
                  Locale
                  <input
                    value={settings.locales}
                    onChange={(e) => set("locales", e.target.value)}
                  />
                </label>
                <label>
                  Style
                  <select
                    value={settings.format.style ?? "decimal"}
                    onChange={(e) =>
                      set("format", {
                        ...settings.format,
                        style: e.target
                          .value as Intl.NumberFormatOptions["style"],
                        currency:
                          e.target.value === "currency"
                            ? (settings.format.currency ?? "EUR")
                            : undefined,
                        unit:
                          e.target.value === "unit"
                            ? (settings.format.unit ?? "kilometer-per-hour")
                            : undefined,
                      })
                    }
                  >
                    {["decimal", "currency", "percent", "unit"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
                {settings.format.style === "currency" && (
                  <label>
                    Currency
                    <input
                      defaultValue={settings.format.currency}
                      maxLength={3}
                      onChange={(e) =>
                        /^[A-Za-z]{3}$/.test(e.target.value) &&
                        set("format", {
                          ...settings.format,
                          currency: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </label>
                )}
                <Toggle
                  label="Grouping"
                  value={settings.format.useGrouping !== false}
                  onChange={(v) =>
                    set("format", { ...settings.format, useGrouping: v })
                  }
                />
                <Slider
                  label="Max fraction digits"
                  value={settings.format.maximumFractionDigits ?? 2}
                  min={0}
                  max={6}
                  step={1}
                  onChange={(v) =>
                    set("format", {
                      ...settings.format,
                      maximumFractionDigits: v,
                      minimumFractionDigits: Math.min(
                        settings.format.minimumFractionDigits ?? 0,
                        v,
                      ),
                    })
                  }
                />
              </>
            )}
            <button
              type="button"
              className="reset"
              onClick={() => setSettings(defaults(scenario))}
            >
              Reset Settings
            </button>
          </section>

          <section className="panel">
            <h3>Steps</h3>
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={s.id} aria-current={i === step}>
                  {scenario.component === "number" ? (
                    <input
                      type="number"
                      value={s.value ?? 0}
                      onChange={(e) =>
                        setSteps((all) =>
                          all.map((x, j) =>
                            j === i
                              ? { ...x, value: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                      aria-label={`Step ${i + 1} value`}
                    />
                  ) : (
                    <input
                      value={s.text ?? ""}
                      onChange={(e) =>
                        setSteps((all) =>
                          all.map((x, j) =>
                            j === i ? { ...x, text: e.target.value } : x,
                          ),
                        )
                      }
                      aria-label={`Step ${i + 1} text`}
                    />
                  )}
                  <span className="at">
                    {s.at !== undefined ? `${s.at.toFixed(3)} s` : "—"}
                  </span>
                  <button type="button" onClick={() => go(i)}>
                    Go
                  </button>
                  <button type="button" onClick={() => instant(i)}>
                    Set
                  </button>
                  <button
                    type="button"
                    disabled={steps.length < 3}
                    onClick={() =>
                      setSteps((all) => all.filter((_, j) => j !== i))
                    }
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() =>
                setSteps((all) => [
                  ...all,
                  { ...all[all.length - 1], at: undefined, id: ids++ },
                ])
              }
            >
              Add Step
            </button>

            <h3>Animations</h3>
            {rows.length === 0 ? (
              <p className="notes">Run a step to list what it animates.</p>
            ) : (
              <table className="rows">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Delay</th>
                    <th>Duration</th>
                    <th>Keyframes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} title={row.easing}>
                      <td>{row.target}</td>
                      <td>{Math.round(row.delay)}</td>
                      <td>{Math.round(row.duration)}</td>
                      <td>{row.properties}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <section className="panel wide">
          <h3>Curves</h3>
          <Curves
            transition={settings.transition}
            layout={layout}
            fixture={scenario.fixture}
            countsDown={countsDown}
            time={time / 1000}
          />
        </section>
      </main>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>
        {label}{" "}
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
