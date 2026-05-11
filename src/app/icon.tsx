import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const boardSquares = [
    [74, 86],
    [256, 86],
    [165, 177],
    [347, 177],
    [74, 268],
    [256, 268],
    [165, 359],
    [347, 359],
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
          borderRadius: "108px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 20,
            border: "8px solid #31564c",
            borderRadius: 108,
          }}
        />
        {boardSquares.map(([left, top]) => (
          <div
            key={`${left}-${top}`}
            style={{
              position: "absolute",
              left,
              top,
              width: 91,
              height: 91,
              background: "#e0f1de",
              opacity: 0.18,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 330,
            top: 223,
            width: 54,
            height: 24,
            background: "#f6d56f",
            borderRadius: 999,
            transform: "rotate(45deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 354,
            top: 201,
            width: 106,
            height: 24,
            background: "#f6d56f",
            borderRadius: 999,
            transform: "rotate(-50deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 328,
            top: 288,
            width: 102,
            height: 16,
            background: "#54c9ab",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 360,
            top: 324,
            width: 70,
            height: 16,
            background: "#f6d56f",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 380,
            width: 230,
            height: 62,
            background: "rgba(1, 5, 4, 0.35)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 187,
            top: 90,
            width: 110,
            height: 110,
            background: "linear-gradient(180deg, #fff9d7 0%, #d9efbd 56%, #8fd6bd 100%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 195,
            top: 212,
            width: 94,
            height: 110,
            background: "linear-gradient(180deg, #fff9d7 0%, #d9efbd 56%, #8fd6bd 100%)",
            borderRadius: "18px 18px 10px 10px",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 172,
            top: 316,
            width: 140,
            height: 58,
            background: "linear-gradient(180deg, #d9efbd 0%, #8fd6bd 100%)",
            borderRadius: "46px 46px 0 0",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 129,
            top: 390,
            width: 226,
            height: 48,
            background: "linear-gradient(90deg, #aee7c5 0%, #fff9d7 100%)",
            borderRadius: 18,
          }}
        />
      </div>
    ),
    size
  );
}
