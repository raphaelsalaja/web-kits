// UINavigationController's push and pop. Both screens ride one fluid spring
// (0.3 s, critically damped), and the retarget impulse starts it already
// moving, so a push leaves faster than a plain spring would.

import { uikit } from "../presets.ts";
import { impulseVelocity } from "../spring.ts";

const { navigation } = uikit;

export const PUSH = {
	spring: navigation.spring,
	/** Initial velocity in progress per second: 8.77. */
	velocity: impulseVelocity(navigation.spring, navigation.retargetImpulse),
};

/** Both screens at progress 0 (before the push) to 1 (pushed). */
export function push(width: number, progress: number) {
	return {
		incoming: width * (1 - progress),
		outgoing: -width * navigation.parallax * progress,
		dimming: progress,
	};
}
