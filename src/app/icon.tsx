import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "112px",
        }}
      >
        <span style={{ fontSize: 300, lineHeight: 1 }}>♟</span>
      </div>
    ),
    size
  );
}
