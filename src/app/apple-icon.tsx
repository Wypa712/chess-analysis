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
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "linear-gradient(135deg, #17231f 0%, #0d1513 58%, #1b2117 100%)",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            border: "3px solid #2d433a",
            borderRadius: 36,
          }}
        />
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: index % 2 === 0 ? 38 : 88,
              top: index < 2 ? 38 : 88,
              width: 38,
              height: 38,
              background: "#d8ead8",
              opacity: 0.14,
            }}
          />
        ))}
        <span
          style={{
            position: "relative",
            color: "#e8f2d2",
            fontSize: 110,
            lineHeight: 1,
            textShadow: "0 8px 14px rgba(0,0,0,0.38)",
          }}
        >
          ♟
        </span>
      </div>
    ),
    size
  );
}
