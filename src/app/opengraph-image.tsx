import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Bracket Lab — March Madness Analytics";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a1a1f 0%, #0f2e36 50%, #0a1a1f 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.06,
            display: "flex",
            fontSize: 200,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🏀
        </div>

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #00f4fe, #ff6b35, #00f4fe)",
          }}
        />

        {/* Site name */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#00f4fe",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Bracket Lab
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
            marginBottom: 20,
          }}
        >
          DoorDash AP 2026
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
            marginBottom: 32,
          }}
        >
          March Madness
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginBottom: 36,
          }}
        >
          {[
            { value: "75", label: "Brackets" },
            { value: "63", label: "Games" },
            { value: "6", label: "Rounds" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  color: "#ff6b35",
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "#8ba4ac",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: "#8ba4ac",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Live standings · Group picks · Win probability · Head-to-head · Simulator
        </div>
      </div>
    ),
    { ...size }
  );
}
