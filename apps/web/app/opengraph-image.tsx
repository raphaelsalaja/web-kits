import { ImageResponse } from "next/og";
import { kits, site } from "@/lib/kits";

export const alt = `${site.name}. ${site.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 88,
        background: "#ffffff",
        color: "#111111",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -3 }}>
          {site.name}
        </div>
        <div style={{ fontSize: 36, color: "#666666", letterSpacing: -1 }}>
          {site.description}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {kits.map((kit) => (
          <div
            key={kit.slug}
            style={{
              display: "flex",
              padding: "14px 24px",
              fontSize: 28,
              background: "#ececec",
              borderRadius: 14,
            }}
          >
            {kit.name}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
