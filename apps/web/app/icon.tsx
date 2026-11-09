import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const tiles = [
  { id: "top-left", color: "#ffffff" },
  { id: "top-right", color: "#ffffff" },
  { id: "bottom-left", color: "#ffffff" },
  { id: "bottom-right", color: "#8f8f8f" },
];

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexWrap: "wrap",
        alignContent: "center",
        justifyContent: "center",
        gap: 3,
        padding: 7,
        background: "#111111",
        borderRadius: 8,
      }}
    >
      {tiles.map((tile) => (
        <div
          key={tile.id}
          style={{
            width: 7,
            height: 7,
            background: tile.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>,
    size,
  );
}
