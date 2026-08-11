import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const size = { width: 1200, height: 630 };

const washi = "#F5F1E8";
const sumi = "#1C1B18";
const gold = "#786000";
const wood = "#B08D57";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "es";
  const eyebrow =
    locale === "en" ? "MURCIA · MATCHA SALON" : "MURCIA · SALÓN DE MATCHA";

  // The salon render as the backdrop, fetched from our own origin. If it
  // fails, fall back to the flat washi + lattice composition.
  let bgSrc: string | null = null;
  try {
    const res = await fetch(new URL("/images/salon.jpg", origin));
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      bgSrc = `data:image/jpeg;base64,${buf.toString("base64")}`;
    }
  } catch {
    bgSrc = null;
  }

  if (bgSrc) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            backgroundColor: sumi,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgSrc}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* flat ink scrim */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(28,27,24,0.55)",
            }}
          />
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
                color: washi,
                opacity: 0.8,
              }}
            >
              {eyebrow}
            </div>
            <div style={{ fontSize: 126, color: washi, marginTop: 24 }}>
              maisha matcha
            </div>
          </div>
        </div>
      ),
      size,
    );
  }

  // Fallback: flat washi field with the timber lattice.
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
