// UIKit's page sheet on iPhone. It presents and dismisses on one
// CASpringAnimation (mass 3, stiffness 1000, damping 500), which Core Animation
// runs critically damped with a 0.344 s response. In iOS 27 the screen behind
// doesn't scale.

import { uikit } from "../../../src/animation/index.ts";

export const SHEET = {
  spring: uikit.sheet,
  /** Where the sheet's top settles on a 402 × 874 point iPhone. */
  top: 62,
};

/** The sheet's top edge at progress 0 (off screen) to 1 (presented). */
export function sheetTop(screenHeight: number, top: number, progress: number) {
  return screenHeight + (top - screenHeight) * progress;
}
