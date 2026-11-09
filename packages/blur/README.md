# @web-kits/blur

The progressive blur from the iOS 27 scroll edge, for the web. It's the soft fade under the navigation bar and over the tab bar: the page's own background laid over the content, then a light blur that falls off down the edge and a much wider blur over that. I measured every value in the Simulator and fitted it to screenshots, then rebuilt it with `backdrop-filter`.

Read how it was measured, with live examples, in [the write-up](https://www.raphaelsalaja.com/work/progressive-blur).

```sh
npm install @web-kits/blur
```

## Quick Start

The blur is drawn into an empty element you place over the content, the **host**. Size and position it yourself, the way you would a fixed strip under a header.

```html
<header class="bar">…</header>
<div class="edge"></div>
```

```css
.edge {
  position: fixed;
  inset: 0 0 auto;
  height: 102px;
}
```

```ts
import { progressiveBlur } from "@web-kits/blur";

const blur = progressiveBlur(document.querySelector(".edge")!);
```

The blur is strongest at the `side` you pass and fades out towards the other one. On iOS the edge runs 40 points past the bottom of the bar, so a 62-point status bar gets 102 points and a navigation bar ending at 116 gets 156.

### React

```tsx
import { ProgressiveBlur } from "@web-kits/blur/react";

<ProgressiveBlur className="edge" side="top" />;
```

Options can change on any render without starting over.

## Options

| Option      | Default                                     |                                                                                |
| ----------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| `side`      | `"top"`                                     | `"top"`, `"bottom"`, `"left"` or `"right"`. Where the blur is strongest.       |
| `color`     | the first background behind the host        | The colour the edge fades into. Apple uses what's behind the scroll view.      |
| `scheme`    | `"auto"`                                    | `"light"` or `"dark"` weights. `"auto"` follows `prefers-color-scheme`.        |
| `start`     | `0.34`, or `0` for `"bottom"`               | Where the fade begins, as a fraction of the host's size.                       |
| `end`       | `0.97`, or `0.954` for `"bottom"`           | Where it reaches nothing.                                                      |
| `technique` | `"auto"`                                    | How the wide blur is blended. See below.                                       |

## Techniques

iOS lays the wide blur over the sharp one three times: normally, with lighten and with darken. The web can draw that in two ways, and neither works everywhere.

| Technique  |                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `"blend"`  | One layer per blend mode with `mix-blend-mode`, the same as iOS. Only WebKit blends a `backdrop-filter` like this.      |
| `"filter"` | All three blends in one SVG filter, used as `backdrop-filter: url(#…)`. Only Chromium takes an SVG filter there.     |
| `"plain"`  | The wide blur at one opacity, the average of the three. For Firefox and anything else.                                |
| `"auto"`   | `"filter"` in Chromium, `"blend"` in Safari and `"plain"` everywhere else.                                              |

Against the Simulator, on a 0 to 1 scale, the edge is within 0.0064 rms in Safari and 0.0089 in Chrome over black and white bars, and 0.0041 in Safari over saturated colours. Chrome blurs in the display's colour space, so on a P3 display saturated colours land 0.031 away. A page can't change that. `"plain"` comes to 0.0162 on the bars.

## Layout

The host gets `pointer-events: none`, and `position: relative` if it was static. Every layer inside is absolutely positioned. Keep the host empty.

A `backdrop-filter` only sees as far back as its backdrop root, so nothing between the host and the content can have `opacity` below 1, a `filter`, a `mask`, `mix-blend-mode` or `will-change` on those. Put the host beside the scrolling content, not inside a faded wrapper.

## Instance

`progressiveBlur` returns:

| Method         |                                                         |
| -------------- | ------------------------------------------------------- |
| `set(options)` | Change any option. The layers are rebuilt in place.     |
| `destroy()`    | Remove the layers and put the host's styles back.       |

The measured values are exported too, as `SOFT`, `SHARP`, `CURVE`, `TOP` and `BOTTOM`.

## Limits

Reduce Transparency isn't handled, because I haven't measured what iOS draws under it. The hard scroll edge and the macOS toolbar edge aren't in the package yet.

## License

[MIT](LICENSE)
