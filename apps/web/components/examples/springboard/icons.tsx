import type { ComponentProps } from "react";

type IconProps = ComponentProps<"svg">;

const icon = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  ...props,
});

export function Plus(props: IconProps) {
  return (
    <svg aria-hidden="true" {...icon(props)}>
      <path
        d="M10 3.5v13M3.5 10h13"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={2}
      />
    </svg>
  );
}

export function Camera(props: IconProps) {
  return (
    <svg aria-hidden="true" {...icon(props)}>
      <circle cx={10} cy={10.5} r={3} fill="currentColor" />
      <path
        d="m14 5h-1.08l-.65-1.42c-.16-.36-.52-.58-.91-.58h-2.72c-.39 0-.75.23-.91.58l-.65 1.42h-1.08c-1.66 0-3 1.34-3 3v5c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3v-5c0-1.66-1.34-3-3-3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

export function Bag(props: IconProps) {
  return (
    <svg aria-hidden="true" {...icon(props)}>
      <path
        d="m17.96 13.43-1.14-8c-.28-1.96-1.98-3.43-3.96-3.43h-5.71c-1.98 0-3.68 1.48-3.96 3.43l-1.14 8c-.16 1.15.18 2.31.94 3.19s1.86 1.38 3.02 1.38h7.99c1.16 0 2.26-.5 3.02-1.38.76-.88 1.1-2.04.94-3.19Zm-7.96-3.43c-1.93 0-3.5-1.57-3.5-3.5 0-.55.45-1 1-1s1 .45 1 1c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5c0-.55.45-1 1-1s1 .45 1 1c0 1.93-1.57 3.5-3.5 3.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Microphone(props: IconProps) {
  return (
    <svg aria-hidden="true" {...icon(props)}>
      <path
        d="M17 8a7 7 0 0 1-14 0M10 15v2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <rect
        x={7}
        y={3}
        width={6}
        height={8}
        rx={3}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    <svg aria-hidden="true" {...icon(props)}>
      <path
        d="M4 11l4 4 8-10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}
