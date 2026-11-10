"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import type { useOrigin } from "@web-kits/springboard/react";
import type { ComponentType, RefObject } from "react";
import styles from "./popups.module.css";

export const COMPONENTS = ["Dialog", "Popover", "Menu", "Select"] as const;

export type Component = (typeof COMPONENTS)[number];

export type Side = "bottom" | "left" | "top" | "right";

export const LABELS: Record<Component, string> = {
  Dialog: "New Note",
  Popover: "Details",
  Menu: "More",
  Select: "Date Edited",
};

const OPPOSITE: Record<Side, Side> = {
  bottom: "top",
  top: "bottom",
  left: "right",
  right: "left",
};

type ExampleProps = {
  stage: RefObject<HTMLDivElement | null>;
  trigger: RefObject<HTMLButtonElement | null>;
  popup: ReturnType<typeof useOrigin>;
  side: Side;
};

const EXAMPLES: Record<Component, ComponentType<ExampleProps>> = {
  Dialog: DialogExample,
  Popover: PopoverExample,
  Menu: MenuExample,
  Select: SelectExample,
};

// A Base UI popup and its trigger, which sits on `side` of the stage with the
// popup opening away from it.
export function Popup({
  component,
  ...props
}: ExampleProps & { component: Component }) {
  const Example = EXAMPLES[component];
  return <Example {...props} />;
}

function DialogExample({ stage, trigger, popup, side }: ExampleProps) {
  return (
    <Dialog.Root modal={false}>
      <Dialog.Trigger ref={trigger} className={styles.trigger} data-side={side}>
        {LABELS.Dialog}
      </Dialog.Trigger>
      <Dialog.Portal container={stage} className={styles.portal}>
        <Dialog.Popup
          ref={popup}
          className={`${styles.surface} ${styles.dialog}`}
        >
          <Dialog.Title className={styles.title}>New Note</Dialog.Title>
          <Dialog.Description className={styles.text}>
            Notes save as you type and sync to your other devices.
          </Dialog.Description>
          <div className={styles.actions}>
            <Dialog.Close className={styles.button}>Cancel</Dialog.Close>
            <Dialog.Close className={styles.button} data-primary="">
              Create
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PopoverExample({ stage, trigger, popup, side }: ExampleProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        ref={trigger}
        className={styles.trigger}
        data-side={side}
      >
        {LABELS.Popover}
      </Popover.Trigger>
      <Popover.Portal container={stage}>
        <Popover.Positioner side={OPPOSITE[side]} sideOffset={8}>
          <Popover.Popup
            ref={popup}
            className={`${styles.surface} ${styles.popover}`}
          >
            <Popover.Title className={styles.title}>Groceries</Popover.Title>
            <Popover.Description className={styles.text}>
              Edited today at 9:41 and shared with 2 people.
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const ACTIONS = ["Pin Note", "Duplicate", "Move to Folder"];

function MenuExample({ stage, trigger, popup, side }: ExampleProps) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger ref={trigger} className={styles.trigger} data-side={side}>
        {LABELS.Menu}
      </Menu.Trigger>
      <Menu.Portal container={stage}>
        <Menu.Positioner side={OPPOSITE[side]} sideOffset={8}>
          <Menu.Popup
            ref={popup}
            className={`${styles.surface} ${styles.list}`}
          >
            {ACTIONS.map((action) => (
              <Menu.Item key={action} className={styles.item}>
                {action}
              </Menu.Item>
            ))}
            <Menu.Separator className={styles.separator} />
            <Menu.Item className={styles.item} data-danger="">
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

const SORTS = [LABELS.Select, "Date Created", "Title"];

function SelectExample({ stage, trigger, popup, side }: ExampleProps) {
  return (
    <Select.Root defaultValue={SORTS[0]} modal={false}>
      <Select.Trigger ref={trigger} className={styles.trigger} data-side={side}>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal container={stage}>
        <Select.Positioner
          side={OPPOSITE[side]}
          sideOffset={8}
          alignItemWithTrigger={false}
        >
          <Select.Popup
            ref={popup}
            className={`${styles.surface} ${styles.list}`}
          >
            {SORTS.map((sort) => (
              <Select.Item key={sort} value={sort} className={styles.item}>
                <Select.ItemText>{sort}</Select.ItemText>
                <Select.ItemIndicator className={styles.check}>
                  <Check />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.5L5 9L9.5 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
