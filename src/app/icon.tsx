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
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "linear-gradient(135deg, #17231f 0%, #0d1513 58%, #1b2117 100%)",
          borderRadius: "104px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 20,
            border: "8px solid #2d433a",
            borderRadius: 104,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 92,
            top: 92,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 256,
            top: 92,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 174,
            top: 174,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 338,
            top: 174,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 92,
            top: 256,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 256,
            top: 256,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 174,
            top: 338,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 338,
            top: 338,
            width: 82,
            height: 82,
            background: "#d8ead8",
            opacity: 0.14,
          }}
        />
        <span
          style={{
            position: "relative",
            color: "#e8f2d2",
            fontSize: 292,
            lineHeight: 1,
            textShadow: "0 18px 30px rgba(0,0,0,0.42)",
          }}
        >
          ♟
        </span>
      </div>
    ),
    size
  );
}
