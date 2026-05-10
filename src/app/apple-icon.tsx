import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2d5a27, #1f2e1f)",
          borderRadius: "40px",
        }}
      >
        <span style={{ fontSize: 110, lineHeight: 1 }}>♟</span>
      </div>
    ),
    size
  );
}
