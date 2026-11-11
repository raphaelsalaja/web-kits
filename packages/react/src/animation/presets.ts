// Apple's presets. SwiftUI's are sampled from macOS 27.0.1, UIKit's and
// SpringBoard's from the iOS 27.0 Simulator's live settings.

import { CURVES } from "./curve.ts";
import { fromBounce, fromPhysics, spring } from "./spring.ts";

export const swiftui = {
  /** `Spring()`, `.smooth` and `Animation.spring`. */
  smooth: spring(0.5, 1),
  /** `.snappy`: bounce 0.15. */
  snappy: fromBounce(0.5, 0.15),
  /** `.bouncy`: bounce 0.3. */
  bouncy: fromBounce(0.5, 0.3),
  /** `.interactiveSpring`, with a blend duration of 0.25 s. */
  interactive: spring(0.15, 0.85),
  /** `Animation.easeInOut`. */
  easeInOut: { duration: 0.35, curve: CURVES.easeInEaseOut },
} as const;

export const uikit = {
  /** `UIView.animate(withDuration:)` without options. */
  curve: CURVES.easeInEaseOut,
  /** `UISpringTimingParameters()`, which ignores the animator's duration. */
  timing: fromPhysics(3, 1000, 500),
  /** Sheets present and dismiss on the same `CASpringAnimation`. */
  sheet: fromPhysics(3, 1000, 500),
  /** `_UIFluidParallaxTransitionSettings`. */
  navigation: {
    spring: spring(0.3, 1),
    interactive: spring(0.3, 0.85),
    retargetImpulse: 0.02,
    /** How far the outgoing screen moves, as a share of the width. */
    parallax: 0.3,
  },
  /** `_UIZoomTransitionAnimationSpec` and `_UIZoomTransitionSpec`. */
  zoom: {
    spring: spring(0.4, 1),
    cornerRadius: spring(0.35, 1),
    recede: 34.666666666666664,
    minimumScale: 0.8,
    dimming: 0.15,
    shadow: { opacity: 0.4, radius: 40, y: 10 },
  },
  /**
   * `AnimationKit.MorphAnimationSettings`, which `_UILiquidMorphAnimation`
   * reads for a glass button's popover or menu. It runs at `speed`, which
   * multiplies every response.
   */
  morph: {
    /** `mainEjectSpring`: the morph out of the button. */
    eject: spring(0.5, 0.75),
    /** `mainAbsorbSpring`: the morph back in. */
    absorb: spring(0.7, 0.8),
    /** `blurInSpring`: the button squaring up on the way out. */
    blurIn: spring(0.3, 1),
    speed: 0.7,
    /** `growingIntermediateShapeRatio`: the button's scale while it's open. */
    intermediate: 0.25,
    /** `liquidMorphReduceMotion`'s content spring. */
    reduceMotion: spring(0.15, 1),
  },
} as const;

export const springboard = {
  /** `genieFullScreenCenterRowZoomUpSettings`: the card on opening an app. */
  open: spring(0.24, 1),
  /** `iconZoomDownSettings`: the card on closing it. */
  close: spring(0.336, 1),
  /** `genieWindowedZoomUpSettings`, for windowed apps. */
  windowed: spring(0.384, 0.85),
  /** `homeScreenScaleSettings`, to `homeScreenScaleInApplication`. */
  home: { spring: spring(0.7, 0.88), scale: 0.88 },
  /**
   * `genieCornerRadiusToAppResetDelay` and `…ToHomeResetDelay`. Opening, the
   * timer starts about 50 ms before the card first moves.
   */
  cornerReset: { open: 0.06, close: 0.12, lead: 0.05 },
  /**
   * `SBHFolderOpenSettings` and `SBHFolderCloseSettings`. Each fade's curve is
   * stored as `UIViewAnimationOptions` bits: 0 is ease in out, 1 << 16 ease in
   * and 2 << 16 ease out.
   */
  folder: {
    spring: fromPhysics(1, 341.51, 36.96),
    zoom: fromPhysics(2, 700, 600),
    open: {
      crossfade: { duration: 0.125, delay: 0, curve: CURVES.easeIn },
      grid: { duration: 0.3, delay: 0, curve: CURVES.easeInEaseOut },
      inner: { duration: 0.3, delay: 0.1, curve: CURVES.easeIn },
      outer: { duration: 0.4, delay: 0, curve: CURVES.easeIn },
    },
    close: {
      crossfade: fromPhysics(2.5, 2000, 500),
      grid: { duration: 0.3, delay: 0, curve: CURVES.easeInEaseOut },
      inner: { duration: 0.2, delay: 0, curve: CURVES.easeOut },
      outer: { duration: 0.3, delay: 0.15, curve: CURVES.easeIn },
    },
  },
  /** `reduceMotionCrossfadeDuration` on UIKit's default curve. */
  reduceMotion: { duration: 0.3, curve: CURVES.easeInEaseOut },
} as const;
