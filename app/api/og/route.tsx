import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

const washi = "#F5F1E8";
const sumi = "#1C1B18";
const gold = "#786000";
const wood = "#B08D57";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "es";
  const eyebrow =
    locale === "en" ? "MURCIA · MATCHA SALON" : "MURCIA · SALÓN DE MATCHA";

  // Faint timber lattice — flat lines, no gradient.
  const lattice: React.ReactElement[] = [];
  for (let x = 60; x < size.width; x += 60) {
    lattice.push(
      <div
        key={`v${x}`}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: x,
          width: 1,
          backgroundColor: wood,
          opacity: 0.1,
        }}
      />,
    );
  }
  for (let y = 60; y < size.height; y += 60) {
    lattice.push(
      <div
        key={`h${y}`}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: y,
          height: 1,
          backgroundColor: wood,
          opacity: 0.1,
        }}
      />,
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: washi,
        }}
      >
        {lattice}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            margin: "auto",
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: 7,
              color: sumi,
              opacity: 0.55,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ fontSize: 132, color: gold, marginTop: 28 }}>
            maisha matcha
          </div>
        </div>
      </div>
    ),
    size,
  );
}
