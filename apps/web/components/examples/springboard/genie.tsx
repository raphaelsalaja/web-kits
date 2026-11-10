"use client";

import { Dialog } from "@base-ui/react/dialog";
import { genie } from "@web-kits/springboard";
import { useOrigin } from "@web-kits/springboard/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppWindow,
  DOCK,
  Dock,
  DockItem,
  desktop,
  Lights,
  type Placement,
  place,
  SCREEN_POINTS,
  Screen,
  tapped,
  tint,
  useDrag,
} from "./desktop";
import styles from "./genie.module.css";

const IDS = ["notes", "photos"] as const;
type Id = (typeof IDS)[number];

const NAMES: Record<Id, string> = { notes: "Notes", photos: "Photos" };

const START: Record<Id, Placement> = {
  notes: { x: 0.06, y: 0.08, width: 0.5, height: 0.32 },
  photos: { x: 0.42, y: 0.22, width: 0.5, height: 0.32 },
};

const windowed = (app: string): app is Id => IDS.includes(app as Id);

// Each window is a non-modal Base UI Dialog. Its Dock icon is the trigger and
// the yellow light is Dialog.Close, so useOrigin does all of the animating.
export function Genie() {
  const [screen, setScreen] = useState<HTMLDivElement | null>(null);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const notesIcon = useRef<HTMLButtonElement>(null);
  const photosIcon = useRef<HTMLButtonElement>(null);
  const icons = { notes: notesIcon, photos: photosIcon };
  const [handles] = useState(() => ({
    notes: Dialog.createHandle(),
    photos: Dialog.createHandle(),
  }));
  const [scale, setScale] = useState(1 / 3);
  const [order, setOrder] = useState<Id[]>(["notes", "photos"]);
  const [open, setOpen] = useState<Record<Id, boolean>>({
    notes: true,
    photos: true,
  });

  useEffect(() => {
    if (!screen) return;
    screenRef.current = screen;
    const update = () => setScale(screen.clientWidth / SCREEN_POINTS);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(screen);
    return () => observer.disconnect();
  }, [screen]);

  // A window stays in front until its minimise finishes, so the copies the
  // genie draws keep the look it had when it was tapped.
  const [shown, setShown] = useState(open);
  const active = order.findLast((id) => shown[id]);
  const focus = (id: Id) =>
    setOrder((current) => [...current.filter((other) => other !== id), id]);

  return (
    <div className={styles.demo} data-demo-id="genie">
      <Screen ref={setScreen}>
        <div ref={setLayer} className={desktop.windows} />
        {layer &&
          IDS.map((id) => (
            <Window
              key={id}
              id={id}
              handle={handles[id]}
              icon={icons[id]}
              open={open[id]}
              onOpenChange={(next, reason) => {
                // The icon of an open window brings it forward, and Escape only
                // minimises the window in front.
                if (!next && reason === "trigger-press") return focus(id);
                if (!next && reason === "escape-key" && id !== active) return;
                setOpen((current) => ({ ...current, [id]: next }));
                if (next) {
                  setShown((current) => ({ ...current, [id]: true }));
                  focus(id);
                }
              }}
              onClosed={() =>
                setShown((current) => ({ ...current, [id]: false }))
              }
              screen={screenRef}
              layer={layer}
              scale={scale}
              depth={order.indexOf(id) + 1}
              active={id === active}
              onFocus={() => focus(id)}
            />
          ))}
        <Dock>
          {DOCK.map(({ id }) =>
            windowed(id) ? (
              <Dialog.Trigger
                key={id}
                ref={icons[id]}
                handle={handles[id]}
                render={<DockItem app={id} running />}
              />
            ) : (
              <DockItem key={id} app={id} />
            ),
          )}
        </Dock>
      </Screen>
    </div>
  );
}

function Window({
  id,
  handle,
  icon,
  open,
  onOpenChange,
  onClosed,
  screen,
  layer,
  scale,
  depth,
  active,
  onFocus,
}: {
  id: Id;
  handle: Dialog.Handle<unknown>;
  icon: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean, reason: string) => void;
  onClosed: () => void;
  screen: React.RefObject<HTMLDivElement | null>;
  layer: HTMLDivElement;
  scale: number;
  depth: number;
  active: boolean;
  onFocus: () => void;
}) {
  const name = NAMES[id];
  const popup = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState({ x: START[id].x, y: START[id].y });
  const onDrag = useDrag(screen, popup, setAt);
  const minimise = useOrigin({
    from: icon,
    bounds: screen,
    effect: genie({ scale }),
  });
  const ref = useCallback(
    (node: HTMLDivElement) => {
      popup.current = node;
      const release = minimise(node);
      return () => {
        popup.current = null;
        release();
      };
    },
    [minimise],
  );

  return (
    <Dialog.Root
      handle={handle}
      open={open}
      onOpenChange={(next, details) => onOpenChange(next, details.reason)}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed();
      }}
      disablePointerDismissal
      modal={false}
    >
      <Dialog.Portal container={layer}>
        <Dialog.Popup
          ref={ref}
          className={desktop.window}
          style={{
            ...place({ ...START[id], ...at }),
            ...tint(id),
            zIndex: depth,
          }}
          data-active={active}
          aria-label={name}
          initialFocus={false}
          finalFocus={false}
          onPointerDown={(event) => {
            onFocus();
            onDrag(event);
          }}
          onClick={(event) => {
            if (tapped(event)) onOpenChange(false, "close-press");
          }}
        >
          <AppWindow
            lights={
              <Lights
                label={name}
                minimise={<Dialog.Close aria-label={`Minimise ${name}`} />}
              />
            }
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
