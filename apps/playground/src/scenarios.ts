import type { NumberTransitionKind } from "@web-kits/react/number-transition";
import type { TextTransitionKind } from "@web-kits/react/text-transition";

export type Crop = { x: number; y: number; w: number; h: number };

export type Reference = {
  src: string;
  /** The part of the frame to show, in video pixels. */
  crop?: Crop;
  /** Video pixels per point. The simulator and the phone record at 3. */
  scale?: number;
};

export const FONTS = {
  System: "system-ui, -apple-system, sans-serif",
  "SF Pro Rounded": '"SF Pro Rounded", ui-rounded, system-ui, sans-serif',
  Serif: "ui-serif, Georgia, serif",
  Mono: "ui-monospace, Menlo, monospace",
  Inter: "Inter, system-ui, sans-serif",
} as const;
export type Font = keyof typeof FONTS;

/** A state the component shows, and when the reference clip changes to it. */
export type Step = { value?: number; text?: string; at?: number };

export type AnimationChoice =
  | "default"
  | "smooth"
  | "snappy"
  | "bouncy"
  | "custom";

export type Scenario = {
  id: string;
  group:
    | "SwiftUI"
    | "SwiftUI Layers"
    | "Family"
    | "Family Values"
    | "Free Play";
  name: string;
  notes?: string;
  component: "number" | "text";
  transition: NumberTransitionKind | TextTransitionKind;
  animation?: AnimationChoice;
  /** A spring of the clip's own, picked as the custom animation. */
  spring?: { response: number; dampingRatio: number };
  countsDown?: boolean;
  format?: Intl.NumberFormatOptions;
  locales?: string;
  size: number;
  weight: number;
  font?: Font;
  /** Shrinks the text to fit this many points, like `minimumScaleFactor`. */
  fit?: number;
  /** Extra stage classes, for styling like Family's small raised currency. */
  className?: string;
  /**
   * Letter spacing in em. CoreText applies a font's `trak` table for its
   * size and Chrome doesn't, so this puts it back.
   */
  tracking?: number;
  theme: "light" | "dark";
  layers?: boolean;
  steps: Step[];
  reference?: Reference;
  /** The fixture series to plot with the curves. */
  fixture?: string;
};

const SIM = { x: 0, y: 900, w: 1206, h: 820 };
const KEYPAD = { x: 0, y: 559, w: 1290, h: 702 };
const BALANCE = { x: 0, y: 360, w: 1290, h: 270 };
const MESSAGE = { x: 195, y: 1050, w: 900, h: 140 };
const FULL = undefined;

const EUR = { style: "currency", currency: "EUR" } as const;
const PLAIN = { useGrouping: false } as const;

type Pair = Omit<
  Scenario,
  "id" | "group" | "weight" | "theme" | "reference" | "steps" | "layers"
> & { from: Step; to: Step };

/** Base pass. `times` are the measured change and change back. */
function base(
  id: string,
  [at, back]: [number, number],
  { from, to, ...scenario }: Omit<Pair, "size">,
): Scenario {
  return {
    id: `swiftui-${id}`,
    group: "SwiftUI",
    size: 64,
    weight: 600,
    theme: "light",
    reference: { src: "/reference/swiftui/base.mp4", crop: SIM },
    steps: [from, { ...to, at }, { ...from, at: back }],
    ...scenario,
  };
}

/**
 * Colored pass: each value keeps its colour, so the change shows the old
 * text red and the new text blue, and the change back swaps them.
 */
function colored(
  id: string,
  [at, back]: [number, number],
  { from, to, ...scenario }: Pair,
): Scenario {
  return {
    id: `layers-${id}`,
    group: "SwiftUI Layers",
    weight: 600,
    theme: "light",
    layers: true,
    reference: { src: "/reference/swiftui/colored.mp4", crop: SIM },
    steps: [from, { ...to, at }, { ...from, at: back }],
    fixture: id,
    ...scenario,
  };
}

const LINEAR =
  "SwiftUI ran this on .linear(duration: 1). Only the layout follows it, so the glyphs match the default run; the web version keeps its spring for the layout.";

export const SCENARIOS: Scenario[] = [
  base("balance-default", [8.925, 10.609], {
    name: "Balance €502.75 → €0.21",
    component: "number",
    transition: "numericText",
    format: EUR,
    locales: "en-IE",
    from: { value: 502.75 },
    to: { value: 0.21 },
  }),
  base("0-1-default", [13.125, 14.742], {
    name: "0 → 1",
    component: "number",
    transition: "numericText",
    format: PLAIN,
    from: { value: 0 },
    to: { value: 1 },
  }),
  base("insert", [17.192, 18.809], {
    name: "Insert 1,256 → 12,565",
    component: "text",
    transition: "numericText",
    from: { text: "1,256" },
    to: { text: "12,565" },
  }),
  base("counts-down", [21.309, 22.925], {
    name: "countsDown 0 → 1",
    component: "text",
    transition: "numericText",
    countsDown: true,
    from: { text: "0" },
    to: { text: "1" },
  }),
  base("99-100", [25.375, 26.975], {
    name: "99 → 100",
    component: "number",
    transition: "numericText",
    format: PLAIN,
    from: { value: 99 },
    to: { value: 100 },
  }),
  base("interpolate-craft", [29.525, 31.142], {
    name: "Interpolate Craft → Creative",
    component: "text",
    transition: "interpolate",
    from: { text: "Craft" },
    to: { text: "Creative" },
  }),
  base("interpolate-still", [33.609, 35.225], {
    name: "Interpolate Still not enough ETH",
    component: "text",
    transition: "interpolate",
    from: { text: "Still not enough ETH" },
    to: { text: "Not enough ETH" },
  }),
  base("opacity-craft", [37.692, 39.392], {
    name: "Opacity Craft → Creative",
    component: "text",
    transition: "opacity",
    from: { text: "Craft" },
    to: { text: "Creative" },
  }),
  base("none-craft", [41.909, 43.575], {
    name: "No transition Craft → Creative",
    notes: "A Text with no contentTransition crossfades like .opacity.",
    component: "text",
    transition: "opacity",
    from: { text: "Craft" },
    to: { text: "Creative" },
  }),
  base("balance-snappy", [46.025, 47.625], {
    name: "Balance on .snappy",
    component: "number",
    transition: "numericText",
    animation: "snappy",
    format: EUR,
    locales: "en-IE",
    from: { value: 502.75 },
    to: { value: 0.21 },
  }),
  base("balance-bouncy", [50.109, 51.709], {
    name: "Balance on .bouncy",
    component: "number",
    transition: "numericText",
    animation: "bouncy",
    format: EUR,
    locales: "en-IE",
    from: { value: 502.75 },
    to: { value: 0.21 },
  }),
  base("0-1-linear", [54.292, 56.309], {
    name: "0 → 1 on linear(1)",
    notes: LINEAR,
    component: "number",
    transition: "numericText",
    format: PLAIN,
    from: { value: 0 },
    to: { value: 1 },
  }),
  base("balance-linear", [59.242, 61.342], {
    name: "Balance on linear(1)",
    notes: LINEAR,
    component: "number",
    transition: "numericText",
    format: EUR,
    locales: "en-IE",
    from: { value: 502.75 },
    to: { value: 0.21 },
  }),
  base("identity-craft", [74.442, 76.175], {
    name: "Identity Craft → Creative",
    component: "text",
    transition: "identity",
    from: { text: "Craft" },
    to: { text: "Creative" },
  }),

  colored("numericValue-0-1-default", [7.357, 9.042], {
    name: "0 → 1, 120pt",
    component: "number",
    transition: "numericText",
    format: PLAIN,
    size: 120,
    from: { value: 0 },
    to: { value: 1 },
  }),
  colored("numericValue-0-1-linear1", [11.55, 13.692], {
    name: "0 → 1 on linear(1), 120pt",
    notes: LINEAR,
    component: "number",
    transition: "numericText",
    format: PLAIN,
    size: 120,
    from: { value: 0 },
    to: { value: 1 },
  }),
  colored("numeric-up-0-1", [20.723, 22.375], {
    name: "countsDown false, 120pt",
    component: "text",
    transition: "numericText",
    size: 120,
    from: { text: "0" },
    to: { text: "1" },
  }),
  colored("numeric-down-0-1", [24.907, 26.609], {
    name: "countsDown true, 120pt",
    component: "text",
    transition: "numericText",
    countsDown: true,
    size: 120,
    from: { text: "0" },
    to: { text: "1" },
  }),
  colored("numericValue-11111-22222", [29.07, 30.775], {
    name: "11111 → 22222, the stagger",
    component: "number",
    transition: "numericText",
    format: PLAIN,
    size: 72,
    from: { value: 11111 },
    to: { value: 22222 },
  }),
  colored("numericValue-9-10", [33.338, 34.942], {
    name: "9 → 10, 120pt",
    component: "number",
    transition: "numericText",
    format: PLAIN,
    size: 120,
    from: { value: 9 },
    to: { value: 10 },
  }),
  colored("opacity-craft", [37.435, 39.042], {
    name: "Opacity, 72pt",
    component: "text",
    transition: "opacity",
    size: 72,
    from: { text: "Craft" },
    to: { text: "Creative" },
  }),
  colored("numericValue-1-2-sameWidth", [59.933, 61.609], {
    name: "1 → 2, same width",
    component: "number",
    transition: "numericText",
    format: PLAIN,
    size: 120,
    from: { value: 1 },
    to: { value: 2 },
  }),

  {
    id: "family-keypad",
    group: "Family",
    name: "Send keypad",
    notes:
      "Every key press in the clip, timed from the frame the amount starts to move. Past seven digits the amount shrinks to fit the screen.",
    component: "number",
    transition: "family-input",
    format: { maximumFractionDigits: 2 },
    locales: "en-US",
    size: 79,
    weight: 700,
    font: "SF Pro Rounded",
    fit: 334,
    theme: "dark",
    className: "keypad",
    reference: {
      src: "/reference/family/recording/send-keypad.mp4",
      crop: KEYPAD,
    },
    steps: (
      [
        [0],
        [1, 2.466],
        [12, 2.983],
        [125, 3.4],
        [1256, 3.966],
        [12565, 4.433],
        [125654, 4.933],
        [1256542, 5.633],
        [12565423, 6.116],
        [125654235, 6.666],
        [12565423, 8.041],
        [1256542, 8.224],
        [125654, 8.491],
        [12565, 8.674],
        [1256, 8.941],
        [12567, 9.833],
        [125675, 10.1],
        [1256752, 10.3],
        [12567525, 10.483],
        [1256752, 11.058],
        [125675, 11.241],
        [12567, 11.374],
        [1256, 11.541],
        [125, 11.674],
        [1252, 12.066],
        [12525, 12.25],
        [125255, 12.383],
        [1252558, 12.55],
        [12525585, 12.733],
        [125255852, 12.883],
        [1252558522, 13.033],
      ] as const
    ).map(([value, at]) => ({ value, at })),
    fixture: "keypad",
  },
  {
    id: "family-balance",
    group: "Family",
    name: "Balance €502.75 ↔ €0.21",
    notes: "Switching between the Tokens and Collectibles tabs.",
    component: "number",
    transition: "family",
    format: EUR,
    locales: "en-IE",
    size: 56,
    weight: 700,
    font: "SF Pro Rounded",
    tracking: -0.018,
    className: "currency",
    theme: "light",
    reference: {
      src: "/reference/family/recording/balance-tabs.mp4",
      crop: BALANCE,
    },
    steps: [
      { value: 502.75 },
      { value: 0.21, at: 3.784 },
      { value: 502.75, at: 4.433 },
    ],
  },
  {
    id: "family-message",
    group: "Family",
    name: "Still not enough ETH → Not enough ETH",
    notes:
      "The message under the amount, while the keypad types, deletes and retypes digits. Family also shakes it on every key press, which isn't part of the transition.",
    component: "text",
    transition: "family",
    size: 17,
    weight: 500,
    font: "SF Pro Rounded",
    tracking: 45 / 2048,
    className: "danger",
    theme: "dark",
    reference: {
      src: "/reference/family/recording/send-keypad.mp4",
      crop: MESSAGE,
    },
    steps: [
      { text: "Not enough ETH" },
      { text: "Still not enough ETH", at: 3.95 },
      { text: "Still not enough ETH 😳", at: 5.633 },
      { text: "Still not enough ETH", at: 8.483 },
      { text: "Still not enough ETH 😳", at: 10.283 },
      { text: "Still not enough ETH", at: 11.233 },
      { text: "Not enough ETH", at: 11.667 },
      { text: "Still not enough ETH", at: 12.05 },
      { text: "Still not enough ETH 😳", at: 12.55 },
      { text: "Still not enough ETH", at: 14.167 },
    ],
  },
  {
    id: "family-collectibles",
    group: "Family",
    name: "Collectibles balance",
    component: "number",
    transition: "family",
    format: EUR,
    locales: "en-IE",
    size: 20,
    weight: 600,
    tracking: -46 / 2048,
    theme: "light",
    className: "end",
    reference: {
      src: "/reference/family/recording/collectibles-balance.mp4",
      crop: { x: 870, y: 520, w: 360, h: 99 },
    },
    steps: [
      { value: 2473.48 },
      { value: 45091.67, at: 0.333 },
      { value: 2473.48, at: 2.2 },
      { value: 45091.67, at: 2.95 },
    ],
  },
  {
    id: "family-swap",
    group: "Family",
    name: "Swap keypad",
    component: "number",
    transition: "family-input",
    format: { maximumFractionDigits: 2 },
    locales: "en-US",
    size: 64,
    weight: 700,
    font: "SF Pro Rounded",
    className: "card keypad",
    theme: "dark",
    reference: {
      src: "/reference/family/recording/swap-keypad.mp4",
      crop: { x: 0, y: 797, w: 1290, h: 282 },
    },
    steps: (
      [
        [0],
        [5, 1.45],
        [55, 1.683],
        [558, 1.817],
        [5585, 2.033],
        [55855, 2.183],
        [5585, 2.908],
        [558, 3.058],
        [55, 3.191],
        [5, 3.391],
        [0, 3.941],
      ] as const
    ).map(([value, at]) => ({ value, at })),
  },
  {
    id: "family-wallet-name",
    group: "Family",
    name: "Wallet name typing",
    component: "text",
    transition: "family",
    size: 32,
    weight: 600,
    theme: "light",
    reference: {
      src: "/reference/family/recording/wallet-name-typing.mp4",
      crop: FULL,
    },
    steps: [{ text: "Wallet" }, { text: "Wallet 2" }],
  },

  {
    id: "values-22",
    group: "Family Values",
    name: "22 · Craft ↔ Creative",
    notes:
      "The title morphing back and forth, on the article's own spring rather than the wallet's. The clip was recorded at 30 fps, so steps are only good to a frame either way.",
    component: "text",
    transition: "family",
    spring: { response: 0.296, dampingRatio: 0.9 },
    size: 40,
    weight: 700,
    font: "SF Pro Rounded",
    tracking: 20 / 2048,
    theme: "light",
    reference: {
      src: "/reference/family/values/22.mp4",
      crop: { x: 0, y: 353, w: 1179, h: 180 },
    },
    steps: [
      { text: "Craft" },
      { text: "Creative", at: 0.583 },
      { text: "Craft", at: 2.05 },
      { text: "Creative", at: 3.316 },
      { text: "Craft", at: 4.716 },
    ],
  },

  {
    id: "values-40",
    group: "Family Values",
    name: "40 · Typing to a billion",
    notes:
      "Zeros typed one after another until the amount shrinks to fit, then cleared back to 0.",
    component: "number",
    transition: "family-input",
    format: { maximumFractionDigits: 2 },
    locales: "en-US",
    size: 79,
    weight: 700,
    font: "SF Pro Rounded",
    fit: 297,
    theme: "dark",
    className: "keypad",
    reference: {
      src: "/reference/family/values/40.mp4",
      crop: { x: 0, y: 620, w: 1179, h: 339 },
    },
    steps: (
      [
        [0],
        [1, 0.9],
        [10, 1.4],
        [100, 1.833],
        [1000, 2.5],
        [10000, 2.783],
        [100000, 3.567],
        [1000000, 3.883],
        [10000000, 4.85],
        [100000000, 5.366],
        [1000000000, 5.933],
        [0, 7.624],
      ] as const
    ).map(([value, at]) => ({ value, at })),
  },

  {
    id: "values-39",
    group: "Family Values",
    name: "39 · Typing to ten million",
    notes:
      "Zeros typed after $100 until the amount shrinks to fit, then deleted back to $100.",
    component: "number",
    transition: "family-input",
    format: { style: "currency", currency: "USD", maximumFractionDigits: 0 },
    locales: "en-US",
    size: 79,
    weight: 700,
    font: "SF Pro Rounded",
    fit: 307,
    theme: "dark",
    className: "keypad dollar",
    reference: {
      src: "/reference/family/values/39.mp4",
      crop: { x: 0, y: 620, w: 1179, h: 339 },
    },
    steps: (
      [
        [100],
        [1000, 0.75],
        [10000, 1.233],
        [100000, 1.783],
        [1000000, 2.366],
        [10000000, 3.316],
        [1000000, 4.341],
        [100000, 4.758],
        [10000, 5.158],
        [1000, 5.574],
        [100, 6.558],
      ] as const
    ).map(([value, at]) => ({ value, at })),
  },

  ...(
    [
      ["18", "Price chart"],
      ["20", "Name your wallet"],
      ["21", "Confirm $1.00"],
      ["23", "Add wallets"],
      ["44", "Clip 44"],
      ["47", "Clip 47"],
      ["51", "Send $299.52"],
      ["53", "USDC chart"],
      ["54", "Chart"],
      ["55", "Polygon chart"],
    ] as const
  ).map(
    ([clip, name]): Scenario => ({
      id: `values-${clip}`,
      group: "Family Values",
      name: `${clip} · ${name}`,
      notes: "Not timed yet: the steps are placeholders next to the clip.",
      component: "number",
      transition: "family",
      format: EUR,
      locales: "en-IE",
      size: 48,
      weight: 600,
      theme: "light",
      reference: { src: `/reference/family/values/${clip}.mp4`, crop: FULL },
      steps: [{ value: 1 }, { value: 299.52 }, { value: 100000 }],
    }),
  ),

  {
    id: "free-number",
    group: "Free Play",
    name: "Number",
    component: "number",
    transition: "numericText",
    format: EUR,
    locales: "en-US",
    size: 72,
    weight: 600,
    theme: "light",
    steps: [
      { value: 502.75 },
      { value: 0.21 },
      { value: 1999.99 },
      { value: 10 },
    ],
  },
  {
    id: "free-text",
    group: "Free Play",
    name: "Text",
    component: "text",
    transition: "family",
    size: 48,
    weight: 600,
    theme: "light",
    steps: [
      { text: "Craft" },
      { text: "Creative" },
      { text: "Create" },
      { text: "Crate" },
    ],
  },
];
