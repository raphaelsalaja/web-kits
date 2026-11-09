import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import { genie, launch } from "@web-kits/springboard";
import { useOrigin } from "@web-kits/springboard/react";
import { type ComponentType, type RefObject, useRef, useState } from "react";
import styles from "./app.module.css";

const COMPONENTS = ["Dialog", "Popover", "Menu", "Select"] as const;

type Component = (typeof COMPONENTS)[number];

type ExampleProps = {
  stage: RefObject<HTMLDivElement | null>;
  trigger: RefObject<HTMLButtonElement | null>;
  popup: ReturnType<typeof useOrigin>;
};

const EXAMPLES: Record<Component, ComponentType<ExampleProps>> = {
  Dialog: DialogExample,
  Popover: PopoverExample,
  Menu: MenuExample,
  Select: SelectExample,
};

export function App() {
  const [component, setComponent] = useState<Component>("Dialog");
  return (
    <main className={styles.frame}>
      <fieldset className={styles.picker} aria-label="Component">
        {COMPONENTS.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={name === component}
            className={styles.option}
            onClick={() => setComponent(name)}
          >
            {name}
          </button>
        ))}
      </fieldset>
      <div className={styles.panes}>
        <Pane
          key={`launch-${component}`}
          label="Launch"
          effect="launch"
          component={component}
        />
        <Pane
          key={`genie-${component}`}
          label="Genie"
          effect="genie"
          component={component}
        />
        <Pane
          key={`switch-${component}`}
          label="Switch"
          effect="switch"
          component={component}
        />
      </div>
    </main>
  );
}

function Pane({
  label,
  effect,
  component,
}: {
  label: string;
  effect: "launch" | "genie" | "switch";
  component: Component;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // The switch pane plays the other effect after every close.
  const [kind, setKind] = useState(effect === "genie" ? "genie" : "launch");
  const popup = useOrigin({
    from: trigger,
    bounds: stage,
    effect:
      kind === "launch"
        ? launch({ grid: { columns: 6, rows: 4 } })
        : genie({ scale: 1 / 2 }),
    onLand: (open) => {
      if (effect === "switch" && !open)
        setKind((current) => (current === "launch" ? "genie" : "launch"));
    },
  });
  const Example = EXAMPLES[component];

  return (
    <div ref={stage} className={styles.pane} data-effect={effect}>
      <span className={styles.label}>{label}</span>
      <Example stage={stage} trigger={trigger} popup={popup} />
    </div>
  );
}

function DialogExample({ stage, trigger, popup }: ExampleProps) {
  return (
    <Dialog.Root modal={false}>
      <Dialog.Trigger ref={trigger} className={styles.trigger}>
        New Note
      </Dialog.Trigger>
      <Dialog.Portal container={stage}>
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

function PopoverExample({ stage, trigger, popup }: ExampleProps) {
  return (
    <Popover.Root>
      <Popover.Trigger ref={trigger} className={styles.trigger}>
        Details
      </Popover.Trigger>
      <Popover.Portal container={stage}>
        <Popover.Positioner side="top" sideOffset={8}>
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

function MenuExample({ stage, trigger, popup }: ExampleProps) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger ref={trigger} className={styles.trigger}>
        More
      </Menu.Trigger>
      <Menu.Portal container={stage}>
        <Menu.Positioner side="top" sideOffset={8}>
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

const SORTS = ["Date Edited", "Date Created", "Title"];

function SelectExample({ stage, trigger, popup }: ExampleProps) {
  return (
    <Select.Root defaultValue={SORTS[0]} modal={false}>
      <Select.Trigger ref={trigger} className={styles.trigger}>
        <Select.Value />
      </Select.Trigger>
      <Select.Portal container={stage}>
        <Select.Positioner
          side="top"
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
