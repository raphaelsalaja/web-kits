# @web-kits/react

React components that move the way iOS does. Each one is rebuilt from what the real thing runs: SwiftUI's content transitions from the springs in SwiftUICore and recordings of the iOS 27 Simulator, and Family's from a 60 fps recording of the app.

```sh
npm install @web-kits/react
```

| Import                               |                                                              |
| ------------------------------------ | ------------------------------------------------------------ |
| `@web-kits/react/number-transition`  | `NumberTransition`: a number that animates between values.   |
| `@web-kits/react/text-transition`    | `TextTransition`: text that animates between strings.        |
| `@web-kits/react/content-transition` | SwiftUI's content transitions, as values for either.         |
| `@web-kits/react/family`             | Family's wallet transitions, as values for either.           |
| `@web-kits/react/animation`          | Apple's springs and curves, for CSS and Motion.              |
| `@web-kits/react/motion-blur`        | Motion blur sized from speed, frame time and shutter.        |
| `@web-kits/react/progressive-blur`   | The progressive blur from the iOS scroll edge.               |

## Number Transition

```tsx
import { NumberTransition } from "@web-kits/react/number-transition";

<NumberTransition
  value={balance}
  format={{ style: "currency", currency: "EUR" }}
/>;
```

`transition` takes a value for how digits change:

| Transition      | From                 |                                                                       |
| --------------- | -------------------- | --------------------------------------------------------------------- |
| `numericText()` | `content-transition` | SwiftUI's `.numericText(value:)`, the default. Digits blur and roll.  |
| `opacity`       | `content-transition` | SwiftUI's `.opacity`. The number crossfades.                          |
| `interpolate`   | `content-transition` | A crossfade that also eases colour, size and weight.                  |
| `identity`      | `content-transition` | SwiftUI's `.identity`. The number swaps.                              |
| `balance`       | `family`             | Family's balance. Each digit spins through the digits in between.     |
| `keypad`        | `family`             | Family's keypad. Typed digits rise in and the rest slide over.        |

Digits roll up when the value grows and down when it shrinks. `numericText({ countsDown: true })` fixes the direction.

## Text Transition

```tsx
import { text } from "@web-kits/react/family";
import { TextTransition } from "@web-kits/react/text-transition";

<TextTransition transition={text}>{label}</TextTransition>;
```

`opacity` is SwiftUI's default for `Text`. Family's `text` slides the characters both strings share and fades the rest. `numericText()`, `interpolate` and `identity` work as they do for numbers.

## Animation

SwiftUI runs `numericText`'s blur, scale and roll on springs of its own, whatever the `Animation`. The `animation` prop sets what does follow it: the width, the glyphs that move over, and crossfades. It takes `"smooth"`, `"snappy"`, `"bouncy"` or any spring:

```tsx
import { spring } from "@web-kits/react/animation";

<NumberTransition value={count} animation={spring(0.4, 0.8)} />;
```

`@web-kits/react/animation` also has SwiftUI's, UIKit's and SpringBoard's presets, `toLinear` for CSS and `toMotion` for [Motion](https://motion.dev).

With reduced motion on, every transition but `identity` crossfades. Screen readers read the whole text, never the glyphs.
