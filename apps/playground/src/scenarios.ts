import type { NumberTransitionKind } from "@web-kits/react/number-transition";
import type { TextTransitionKind } from "@web-kits/react/text-transition";

export type Crop = { x: number; y: number; w: number; h: number };

export type Reference = {
  src: string;
  /** The part of the frame to show, in video pixels. */
  crop?: Crop;
};

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
  countsDown?: boolean;
  format?: Intl.NumberFormatOptions;
  locales?: string;
  size: number;
  weight: number;
  theme: "light" | "dark";
  layers?: boolean;
  steps: Step[];
  reference?: Reference;
  /** The fixture series to plot with the curves. */
  fixture?: string;
};

const SIM = { x: 0, y: 900, w: 1206, h: 820 };
const KEYPAD = { x: 0, y: 450, w: 1290, h: 700 };
const BALANCE = { x: 0, y: 250, w: 1290, h: 560 };
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
      "Each step is one key press, timed from when its spring starts, a couple of frames before the digit clears the mask. Later presses delete and retype, so only the first run is scripted.",
    component: "number",
    transition: "family-input",
    format: { maximumFractionDigits: 2 },
    locales: "en-US",
    size: 64,
    weight: 600,
    theme: "dark",
    reference: {
      src: "/reference/family/recording/send-keypad.mp4",
      crop: KEYPAD,
    },
    steps: [
      { value: 0 },
      { value: 1, at: 2.436 },
      { value: 12, at: 2.953 },
      { value: 125, at: 3.37 },
      { value: 1256, at: 3.936 },
      { value: 12565, at: 4.403 },
      { value: 125654, at: 4.903 },
      { value: 1256542, at: 5.604 },
      { value: 12565423, at: 6.087 },
      { value: 125654235, at: 6.637 },
    ],
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
    weight: 600,
    theme: "light",
    reference: {
      src: "/reference/family/recording/balance-tabs.mp4",
      crop: BALANCE,
    },
    steps: [
      { value: 502.75 },
      { value: 0.21, at: 3.793 },
      { value: 502.75, at: 4.427 },
    ],
  },
  {
    id: "family-message",
    group: "Family",
    name: "Still not enough ETH → Not enough ETH",
    notes:
      "The message under the amount, while the keypad deletes and retypes digits.",
    component: "text",
    transition: "family",
    size: 32,
    weight: 500,
    theme: "dark",
    reference: {
      src: "/reference/family/recording/send-keypad.mp4",
      crop: MESSAGE,
    },
    steps: [
      { text: "Still not enough ETH 😳" },
      { text: "Still not enough ETH", at: 8.49 },
      { text: "Still not enough ETH 😳", at: 10.31 },
      { text: "Still not enough ETH", at: 11.24 },
      { text: "Not enough ETH", at: 11.675 },
      { text: "Still not enough ETH 😳", at: 12.575 },
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
    size: 56,
    weight: 600,
    theme: "light",
    reference: {
      src: "/reference/family/recording/collectibles-balance.mp4",
      crop: BALANCE,
    },
    steps: [{ value: 502.75 }, { value: 0.21 }],
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
    weight: 600,
    theme: "dark",
    reference: {
      src: "/reference/family/recording/swap-keypad.mp4",
      crop: FULL,
    },
    steps: [{ value: 0 }, { value: 1 }, { value: 12 }, { value: 125 }],
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

  ...(
    [
      ["18", "Price chart"],
      ["20", "Name your wallet"],
      ["21", "Confirm $1.00"],
      ["22", "Craft ↔ Creative"],
      ["23", "Add wallets"],
      ["39", "Confirm, dark"],
      ["40", "Clip 40"],
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
      component: clip === "22" ? "text" : "number",
      transition: "family",
      format: EUR,
      locales: "en-IE",
      size: 48,
      weight: 600,
      theme: "light",
      reference: { src: `/reference/family/values/${clip}.mp4`, crop: FULL },
      steps:
        clip === "22"
          ? [{ text: "Craft" }, { text: "Creative" }, { text: "Craft" }]
          : [{ value: 1 }, { value: 299.52 }, { value: 100000 }],
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
