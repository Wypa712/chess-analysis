import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const boardSquares = [
    [26, 30],
    [90, 30],
    [58, 62],
    [122, 62],
    [26, 94],
    [90, 94],
    [58, 126],
    [122, 126],
  ];

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
          background: "linear-gradient(135deg, #17352e 0%, #091210 52%, #24301b 100%)",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            border: "3px solid #31564c",
            borderRadius: 36,
          }}
        />
        {boardSquares.map(([left, top]) => (
          <div
            key={`${left}-${top}`}
            style={{
              position: "absolute",
              left,
              top,
              width: 32,
              height: 32,
              background: "#e0f1de",
              opacity: 0.18,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 116,
            top: 80,
            width: 20,
            height: 9,
            background: "#f6d56f",
            borderRadius: 999,
            transform: "rotate(45deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 126,
            top: 72,
            width: 40,
            height: 9,
            background: "#f6d56f",
            borderRadius: 999,
            transform: "rotate(-50deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 115,
            top: 101,
            width: 36,
            height: 6,
            background: "#54c9ab",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 66,
            top: 32,
            width: 40,
            height: 40,
            background: "linear-gradient(180deg, #fff9d7 0%, #d9efbd 56%, #8fd6bd 100%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 76,
            width: 32,
            height: 42,
            background: "linear-gradient(180deg, #fff9d7 0%, #d9efbd 56%, #8fd6bd 100%)",
            borderRadius: "8px 8px 4px 4px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 111,
            width: 52,
            height: 18,
            background: "linear-gradient(180deg, #d9efbd 0%, #8fd6bd 100%)",
            borderRadius: "18px 18px 0 0",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 45,
            top: 137,
            width: 80,
            height: 17,
            background: "linear-gradient(90deg, #aee7c5 0%, #fff9d7 100%)",
            borderRadius: 8,
          }}
        />
      </div>
    ),
    size
  );
}
