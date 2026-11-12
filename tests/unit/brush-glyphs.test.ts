import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRUSH_GLYPHS } from "@/lib/brushGlyphs";

const root = path.resolve(__dirname, "../..");
const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.name === "node_modules" || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );

describe("brush font subset", () => {
  it("holds every Japanese character the site uses", () => {
    const used = new Set<string>();
    for (const f of ["app", "components", "content", "messages", "emails"].flatMap((d) => walk(path.join(root, d))).filter((f) => /\.(tsx?|json)$/.test(f))) {
      for (const c of fs.readFileSync(f, "utf8")) if (/[぀-ヿ一-鿿]/.test(c)) used.add(c);
    }
    const missing = [...used].filter((c) => !BRUSH_GLYPHS.includes(c));
    expect(missing, "add these to lib/brushGlyphs.ts and re-download the subset").toEqual([]);
  });
});
