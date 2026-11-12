import { type RefObject, useEffect, useState } from "react";
import type { Reference } from "./scenarios.ts";

export const FPS = 60;

export function ReferenceVideo({
  reference,
  video,
  zoom,
  scale,
}: {
  reference: Reference;
  video: RefObject<HTMLVideoElement | null>;
  zoom: boolean;
  /** Pane pixels per point. */
  scale: number;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [time, setTime] = useState(0);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (video.current) setTime(video.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [video]);

  const crop = zoom && size ? reference.crop : undefined;
  const style =
    crop && size
      ? {
          width: `${(100 * size.w) / crop.w}%`,
          left: `${(-100 * crop.x) / crop.w}%`,
          top: `${(-100 * crop.y) / crop.h}%`,
        }
      : undefined;

  return (
    <div className={reference.crop ? "reference sized" : "reference"}>
      <div
        className="crop"
        style={{
          width: reference.crop
            ? (reference.crop.w / (reference.scale ?? 3)) * scale
            : undefined,
          aspectRatio: crop
            ? `${crop.w} / ${crop.h}`
            : size
              ? `${size.w} / ${size.h}`
              : "9 / 16",
          maxHeight: crop ? undefined : 560,
        }}
      >
        {missing ? (
          <p className="missing">
            {reference.src} isn't linked. Run{" "}
            <code>pnpm --filter @web-kits/playground references</code>.
          </p>
        ) : (
          <video
            ref={video}
            src={reference.src}
            muted
            playsInline
            preload="auto"
            className={crop ? "cropped" : undefined}
            style={style}
            onLoadedMetadata={(e) =>
              setSize({
                w: e.currentTarget.videoWidth,
                h: e.currentTarget.videoHeight,
              })
            }
            onError={() => setMissing(true)}
          />
        )}
      </div>
      <div className="meta">
        <span>{time.toFixed(3)} s</span>
        <span>frame {Math.round(time * FPS)}</span>
        <span>{reference.src.split("/").pop()}</span>
      </div>
    </div>
  );
}
