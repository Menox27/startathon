import { ImageResponse } from "next/og";

/** App icon (graduation cap on brand blue), rendered as PNG. Glyph stays inside the maskable safe zone. */
export function appIcon(size: number, { rounded = false } = {}) {
  const glyph = Math.round(size * 0.56);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2b4fd8",
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
          <path d="M22 10v6" />
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
