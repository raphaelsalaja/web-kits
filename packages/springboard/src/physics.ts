// UIScrollView's gesture physics: rubber banding past an edge, deceleration
// after a flick, and handing a gesture's velocity to a spring.

/** UIScrollView's `_currentRubberBandCoefficient`. */
export const RUBBER_BAND = 0.55;

/** `UIScrollView.DecelerationRate`, per millisecond. */
export const DECELERATION = { normal: 0.998, fast: 0.99 } as const;

/**
 * How far content moves when dragged `offset` past an edge of a view
 * `dimension` long. It never reaches `dimension`.
 */
export function rubberBand(
	offset: number,
	dimension: number,
	coefficient = RUBBER_BAND,
) {
	if (dimension <= 0) return 0;
	const distance = Math.abs(offset);
	const moved =
		(1 - 1 / ((distance * coefficient) / dimension + 1)) * dimension;
	return Math.sign(offset) * moved;
}

/** Where a flick at `velocity` points a second comes to rest. */
export function project(velocity: number, rate: number = DECELERATION.normal) {
	return ((velocity / 1000) * rate) / (1 - rate);
}

/** How far a flick has travelled after `time` seconds of deceleration. */
export function decay(
	velocity: number,
	time: number,
	rate: number = DECELERATION.normal,
) {
	return project(velocity, rate) * (1 - rate ** (Math.max(time, 0) * 1000));
}

/** The flick's velocity after `time` seconds. */
export function decayVelocity(
	velocity: number,
	time: number,
	rate: number = DECELERATION.normal,
) {
	return velocity * rate ** (Math.max(time, 0) * 1000);
}

/**
 * A gesture's velocity in points per second, as a spring's initial velocity
 * for the move from `from` to `to`, in units of that distance per second.
 */
export function springVelocity(velocity: number, from: number, to: number) {
	const distance = to - from;
	return distance === 0 ? 0 : velocity / distance;
}
