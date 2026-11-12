# @web-kits/react

React components that move the way iOS does. Each one is rebuilt from what the real thing runs: SwiftUI's content transitions from the springs in SwiftUICore and recordings of the iOS 27 Simulator, and Family's from a 60 fps recording of the app.

```sh
npm install @web-kits/react
```

| Import                                | |
| ------------------------------------- | --------------------------------------------------------------------- |
| `@web-kits/react/number-transition`   | `NumberTransition`: a number that animates between values.            |
| `@web-kits/react/text-transition`     | `TextTransition`: text that animates between strings.                 |
| `@web-kits/react/springs`             | The springs both run on, as SwiftUI describes them.                   |

## Number Transition

```tsx
import { NumberTransition } from "@web-kits/react/number-transition";

<NumberTransition
  value={balance}
  format={{ style: "currency", currency: "EUR" }}
/>;
```

`transition` picks how digits change:

| Transition     | |
| -------------- | ------------------------------------------------------------------------------------------- |
| `numericText`  | SwiftUI's `.numericText(value:)`. Changed digits blur, shrink and roll, one after another.  |
| `opacity`      | SwiftUI's `.opacity`. The number crossfades.                                                |
| `interpolate`  | SwiftUI's `.interpolate`. A crossfade that also eases colour, size and weight.              |
| `identity`     | SwiftUI's `.identity`. The number swaps.                                                    |
| `family`       | Family's balance. Each digit spins through the digits in between.                           |
| `family-input` | Family's keypad. Typed digits rise in and the rest slide over.                              |

Digits roll up when the value grows and down when it shrinks. `countsDown` fixes the direction.

## Text Transition

```tsx
import { TextTransition } from "@web-kits/react/text-transition";

<TextTransition transition="family">{label}</TextTransition>;
```

`opacity` is SwiftUI's default for `Text`. `family` slides the characters both strings share and fades the rest, like Family's wallet. `numericText`, `interpolate` and `identity` work as they do for numbers.

## Animation

SwiftUI runs `numericText`'s blur, scale and roll on springs of its own, whatever the `Animation`. The `animation` prop sets what does follow it: the width, the glyphs that move over, and crossfades. It takes `"smooth"`, `"snappy"`, `"bouncy"` or any spring:

```tsx
import { spring } from "@web-kits/react/springs";

<NumberTransition value={count} animation={spring(0.4, 0.8)} />;
```

With reduced motion on, every transition but `identity` crossfades. Screen readers read the whole text, never the glyphs.
