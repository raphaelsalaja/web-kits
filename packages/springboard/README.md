# @web-kits/springboard

Apple's motion for the web, from the values iOS and macOS ship. Open a popup out of its button the way SpringBoard opens an app, minimise a window into its icon the way the Dock does, morph a menu out of a glass button the way iOS 27 does, or use SwiftUI's, UIKit's and SpringBoard's springs on anything else. It works with plain DOM, React, Base UI and Motion.

Read how they work, with live examples, in the write-ups on [opening an app](https://www.raphaelsalaja.com/work/apple), [the genie](https://www.raphaelsalaja.com/work/genie) and [the glass menu](https://www.raphaelsalaja.com/work/glass-menu).

```sh
npm install @web-kits/springboard
```

| Import                         |                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `@web-kits/springboard`        | `origin`, its effects, springs, presets, timing curves, corners and screen transitions.     |
| `@web-kits/springboard/react`  | `useOrigin`.                                                                                |
| `@web-kits/springboard/motion` | Every preset as a Motion transition.                                                        |

## Quick Start

The element that opens is the **popup**, and the element it opens out of is `from`, like an app's icon. `origin` opens one out of the other with an effect: `launch()` grows it out like an app, `genie()` brings it back out of the Dock, and `morph()` pours it out of a glass button like an iOS 27 menu.

```ts
import { launch, origin } from "@web-kits/springboard";

const note = origin(document.querySelector(".note")!, {
	from: document.querySelector(".new-note"),
	effect: launch(),
});

button.addEventListener("click", () => note.toggle());
```

The popup starts closed and hidden. Every effect draws copies of the popup in a layer next to it, so give the popup a positioned parent, or pass `bounds`. `from` and `bounds` take an element, a ref or a function that returns one, read each time a run starts, so they can be rendered later.

Each effect takes its own options:

```ts
import { genie, launch, swiftui } from "@web-kits/springboard";

launch({ springs: { open: swiftui.snappy }, grid: { columns: 8, rows: 6 } });
genie({ edge: "left", duration: 0.6 });
```

An effect is a plain value, so to share one, export it and use it everywhere:

```ts
export const zoom = launch({ springs: { open: swiftui.snappy } });
```

### React

```tsx
import { launch } from "@web-kits/springboard";
import { useOrigin } from "@web-kits/springboard/react";

function Notes() {
	const button = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const note = useOrigin({ from: button, effect: launch(), open });
	return (
		<>
			<button ref={button} onClick={() => setOpen(true)}>
				New Note
			</button>
			<div ref={note} className="note">
				…
			</div>
		</>
	);
}
```

Put the ref on the popup. Options can change on any render, and the effect picks them up without starting over. A new effect applies from the next run, so one that changes mid-run lands first.

### Base UI

Leave out `open` on a Base UI popup and the hook follows the popup's own open state. Base UI keeps a closing popup mounted until its animations finish, and every effect holds an animation on the popup until they land, so the popup stays until it's back in its button:

```tsx
import { Menu } from "@base-ui/react/menu";
import { genie } from "@web-kits/springboard";
import { useOrigin } from "@web-kits/springboard/react";

function More() {
	const trigger = useRef<HTMLButtonElement>(null);
	const popup = useOrigin({ from: trigger, effect: genie() });
	return (
		<Menu.Root>
			<Menu.Trigger ref={trigger}>More</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner>
					<Menu.Popup ref={popup}>…</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
```

It works on Dialog, Popover, Menu and Select. Other libraries, and Radix's `data-state`, need `open`.

## Options

| Option          | Default      |                                                                                                                                                                                                                                                  |
| --------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `from`          |              | The element the popup opens out of and closes back into.                                                                                                                                                                                         |
| `effect`        |              | `launch()`, `genie()` or `morph()`.                                                                                                                                                                                                              |
| `bounds`        | the viewport | The positioned element the copies are drawn in. The genie's funnel is clipped to it.                                                                                                                                                             |
| `hideTarget`    | per effect   | Hides `from` while the popup's open. Launch does, like an icon under its app, and the genie doesn't, like a Dock tile. Shown, the popup fades in and out over it, so give `from` a `z-index` over the copies for the popup to go in under it. |
| `reducedMotion` | `"user"`     | `"user"` crossfades under `prefers-reduced-motion`. `"always"` always does, and `"never"` never.                                                                                                                                                 |
| `speed`         | `1`          | Plays slower or faster, like the Simulator's Slow Animations. `0.1` is ten times slower, and changing it takes effect mid-run.                                                                                                                    |
| `debug`         | `false`      | Draws the mesh: its pieces in blue and its vertices in orange.                                                                                                                                                                                   |
| `open`          | `false`      | Starts open, with no animation. In React, it drives the popup.                                                                                                                                                                                   |
| `onStart`       |              | Called with `true` when it starts opening and `false` when it starts closing.                                                                                                                                                                    |
| `onFrame`       |              | Called every frame with `{ progress }`, from 0 closed to 1 open. Launch's frames also carry the card's rect, corner radius, mesh and home scale.                                                                                                 |
| `onLand`        |              | Called once it's landed open or closed.                                                                                                                                                                                                          |

### `launch()`

| Option    | Default                    |                                                                                                               |
| --------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `grid`    | `{ columns: 12, rows: 8 }` | Tiles across and down the card. Finer grids bend more smoothly and cost more.                                 |
| `fade`    | `{ in: 0.15, out: 0.2 }`   | Seconds to fade from `from` to the popup on the way out, and the share of the way back it takes to fade back. |
| `springs` | SpringBoard's              | Any of `open`, `close`, `home` and `cornerReset`, over SpringBoard's.                                         |
| `home`    |                            | An element behind the popup that recedes to 88% like the home screen.                                         |

Every vertex of the card has its own spring, as on iOS, so the edge nearest `from` leads and the far edge catches up. The card lands once no vertex moves faster than 3 px a second.

### `genie()`

| Option     | Default    |                                                                      |
| ---------- | ---------- | -------------------------------------------------------------------- |
| `edge`     | `"bottom"` | The side the Dock is on. `"auto"` picks the side `from` is on.       |
| `scale`    | `1`        | CSS pixels per macOS point, so a small screen bends like a full one. |
| `duration` | `0.5`      | Seconds from open to minimised.                                      |
| `fade`     | `false`    | Fades the window out over the second half. The Dock doesn't.         |
| `blur`     | `false`    | Blurs the window over the second half.                               |

### `morph()`

| Option  | Default                       |                                                                                                       |
| ------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pivot` | `from`'s first element        | The label inside the button the popup grows from, like `matchedTransitionSource` on the label.       |
| `fill`  | the popup's background colour | The glass both shapes are filled with while they're joined.                                           |
| `lens`  | `true`                        | Bends the content at the rim as it grows, with an SVG displacement filter.                           |

One spring moves the popup out of the label and the button down to a quarter of its size, on iOS's `mainEjectSpring` and `mainAbsorbSpring` at speed 0.7. A blurred field joins the two shapes into one while they're close, and the kick, the lens and the field's blur each go out and come back on springs fitted from the Simulator. It hides `from` while it's open, as iOS absorbs the button.

## Instance

`origin` returns:

| Method               |                                                      |
| -------------------- | ---------------------------------------------------- |
| `isOpen`             | Whether it's open or opening.                        |
| `open({ instant })`  | Open, or turn round if it's closing.                 |
| `close({ instant })` | Close, or turn round if it's opening.                |
| `toggle()`           | Open if it's closed or closing, and close otherwise. |
| `set(options)`       | Change any option except `open`.                     |
| `destroy()`          | Stop, and remove anything it added.                  |

`instant: true` jumps to the end with no animation. The meshes, springs and drivers the effects are built from are exported too, for drawing them some other way.

## Springs

Every spring is a response, the seconds it takes to get most of the way, and a damping ratio, the same pair SwiftUI's `Spring(response:dampingRatio:)` takes:

```ts
import { springboard, swiftui, toLinear, uikit } from "@web-kits/springboard";

swiftui.bouncy; // { response: 0.5, dampingRatio: 0.7 }
uikit.sheet; // UISpringTimingParameters(mass: 3, stiffness: 1000, damping: 500)
springboard.open; // the card on opening an app

const { easing, duration } = toLinear(swiftui.snappy);
el.animate({ scale: [0.9, 1] }, { easing, duration });
```

`toLinear` samples a spring into a CSS `linear()` easing, which can't carry velocity into a new target. For motion that's interrupted, use Motion:

```tsx
import { swiftui } from "@web-kits/springboard/motion";

<motion.div animate={{ x }} transition={swiftui.snappy} />;
```

`toMotion(spring, speed)` converts any other spring, and `speed` plays it faster or slower, like SwiftUI's `.speed()`.

## License

[MIT](LICENSE)
