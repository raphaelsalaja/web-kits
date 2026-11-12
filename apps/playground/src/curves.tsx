import { type Spring, settle, value } from "@web-kits/react/springs";
import familyFixture from "../../../packages/react/src/fixtures/family.json";
import swiftuiFixture from "../../../packages/react/src/fixtures/swiftui.json";
import {
  family,
  numericText,
} from "../../../packages/react/src/internal/presets.ts";
import { Chart, type Series } from "./chart.tsx";

type Layer = { dy: number; alpha: number; scale: number; blur: number };
type Frame = { t: number; old: Layer | null; new: Layer | null };
const scenarios = swiftuiFixture.scenarios as Record<
  string,
  { frames: Frame[] }
>;

const OLD = "#e5484d";
const NEW = "#3e63dd";
const MODEL = "#8f8f8f";
const ALT = "#30a46c";

function curve(
  spring: Spring,
  map: (p: number) => number,
  end = 1,
): [number, number][] {
  return Array.from({ length: 121 }, (_, i) => {
    const t = (i / 120) * end;
    return [t, map(value(spring, t))];
  });
}

function measured(
  id: string,
  layer: "old" | "new",
  key: keyof Layer,
): [number, number][] {
  return (scenarios[id]?.frames ?? []).flatMap((f) => {
    const found = f[layer];
    return found ? [[f.t, found[key]] as [number, number]] : [];
  });
}

export function Curves({
  transition,
  layout,
  fixture,
  countsDown,
  time,
}: {
  transition: string;
  layout: Spring;
  fixture?: string;
  countsDown?: boolean;
  time?: number;
}) {
  const charts: { title: string; series: Series[]; x?: [number, number] }[] =
    [];
  const end = Math.max(1, Math.ceil(settle(layout) * 10) / 10);

  if (transition === "numericText") {
    const sign = countsDown ? -1 : 1;
    const { offset, scale, blur, fadeOut } = numericText;
    const has = fixture && scenarios[fixture];
    const fade = numericText.fade;
    const move = numericText.move;
    charts.push(
      {
        title: "Offset (em) · move spring: mass 2, stiffness 470, damping 34",
        series: [
          {
            label: "Old, model",
            color: OLD,
            points: curve(move, (p) => -sign * offset * p),
          },
          {
            label: "New, model",
            color: NEW,
            points: curve(move, (p) => sign * offset * (1 - p)),
          },
          ...(has
            ? [
                {
                  label: "Old, SwiftUI",
                  color: OLD,
                  dots: true,
                  points: measured(fixture, "old", "dy"),
                },
                {
                  label: "New, SwiftUI",
                  color: NEW,
                  dots: true,
                  points: measured(fixture, "new", "dy"),
                },
              ]
            : []),
        ],
      },
      {
        title: "Alpha · fade spring: mass 1, stiffness 344, damping 37",
        series: [
          {
            label: "Old, model",
            color: OLD,
            points: curve(fade, (p) => Math.max(1 - fadeOut * p, 0)),
          },
          { label: "New, model", color: NEW, points: curve(fade, (p) => p) },
          ...(has
            ? [
                {
                  label: "Old, SwiftUI",
                  color: OLD,
                  dots: true,
                  points: measured(fixture, "old", "alpha"),
                },
                {
                  label: "New, SwiftUI",
                  color: NEW,
                  dots: true,
                  points: measured(fixture, "new", "alpha"),
                },
              ]
            : []),
        ],
      },
      {
        title: "Scale · fade spring",
        series: [
          {
            label: "Old, model",
            color: OLD,
            points: curve(fade, (p) => 1 - (1 - scale) * p),
          },
          {
            label: "New, model",
            color: NEW,
            points: curve(fade, (p) => scale + (1 - scale) * p),
          },
          ...(has
            ? [
                {
                  label: "Old, SwiftUI",
                  color: OLD,
                  dots: true,
                  points: measured(fixture, "old", "scale"),
                },
                {
                  label: "New, SwiftUI",
                  color: NEW,
                  dots: true,
                  points: measured(fixture, "new", "scale"),
                },
              ]
            : []),
        ],
      },
      {
        title: "Blur sigma (em) · fade spring",
        series: [
          {
            label: "Old, model",
            color: OLD,
            points: curve(fade, (p) => blur * p),
          },
          {
            label: "New, model",
            color: NEW,
            points: curve(fade, (p) => blur * (1 - p)),
          },
          ...(has
            ? [
                {
                  label: "Old, SwiftUI",
                  color: OLD,
                  dots: true,
                  points: measured(fixture, "old", "blur"),
                },
                {
                  label: "New, SwiftUI",
                  color: NEW,
                  dots: true,
                  points: measured(fixture, "new", "blur"),
                },
              ]
            : []),
        ],
      },
    );
  }

  if (transition === "family-input") {
    const { enter, exit, slide, enterOffset, exitOffset } = family.input;
    charts.push(
      {
        title: "Keypad offset (cap heights)",
        x: [0, 0.5],
        series: [
          {
            label: "Enter, model",
            color: NEW,
            points: curve(enter, (p) => enterOffset * (1 - p), 0.5),
          },
          {
            label: "Exit, model",
            color: OLD,
            points: curve(exit, (p) => -exitOffset * p, 0.5),
          },
          ...familyFixture.keypad.enter.map((event, i) => ({
            label: i === 0 ? "Enter, Family" : `Enter, Family ${i + 1}`,
            color: NEW,
            dots: true,
            points: event.samples
              .slice(
                event.samples.reduce(
                  (top, s, j, all) => (s.y > all[top].y ? j : top),
                  0,
                ),
              )
              .map((s) => [s.t + 0.05, s.y] as [number, number]),
          })),
        ],
      },
      {
        title: "Slide progress · stiffness 1300, critically damped",
        x: [0, 0.5],
        series: [
          { label: "Slide", color: MODEL, points: curve(slide, (p) => p, 0.5) },
        ],
      },
    );
  }

  if (transition === "family") {
    charts.push({
      title: "Family progress",
      x: [0, 0.6],
      series: [
        {
          label: "Wheel · k520 ζ0.95",
          color: NEW,
          points: curve(family.wheel, (p) => p, 0.6),
        },
        {
          label: "Layout and fades · k803 ζ1.05",
          color: ALT,
          points: curve(family.layout, (p) => p, 0.6),
        },
      ],
    });
  }

  charts.push({
    title: `Animation · response ${layout.response.toFixed(3)} s, damping ${layout.dampingRatio.toFixed(2)}, settles in ${Math.round(settle(layout) * 1000)} ms`,
    x: [0, end],
    series: [
      {
        label: "Width, kept glyphs and crossfades",
        color: MODEL,
        points: curve(layout, (p) => p, end),
      },
    ],
  });

  return (
    <div className="charts">
      {charts.map((chart) => (
        <Chart key={chart.title} time={time} {...chart} />
      ))}
    </div>
  );
}
