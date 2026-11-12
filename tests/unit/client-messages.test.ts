import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENT_NAMESPACES, pickClientMessages } from "@/i18n/clientMessages";
import es from "@/messages/es.json";
import en from "@/messages/en.json";

const root = path.resolve(__dirname, "../..");
const walk = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.name === "node_modules" || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
  );
const src = (f: string) => fs.readFileSync(f, "utf8");

/** Every module a public client component can reach (imports followed). */
function publicClientModules() {
  const files = ["app", "components", "lib"].flatMap((d) => walk(path.join(root, d))).filter((f) => /\.tsx?$/.test(f));
  const resolve = (from: string, spec: string) => {
    const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.join(path.dirname(from), spec) : null;
    if (!base) return null;
    return ["", ".tsx", ".ts", "/index.tsx", "/index.ts"].map((e) => base + e).find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) ?? null;
  };
  // The counter has its own provider (pos only); everything else is public.
  const isPublicClient = (f: string) => /^\s*["']use client["']/.test(src(f)) && !f.includes(`${path.sep}pos${path.sep}`) && !f.includes("(pos)");
  const seen = new Set<string>();
  const queue = files.filter(isPublicClient);
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of src(f).matchAll(/from\s+["']([^"']+)["']/g)) {
      const r = resolve(f, m[1]);
      if (r && !r.includes(`${path.sep}pos${path.sep}`)) queue.push(r);
    }
  }
  return [...seen];
}

describe("translations sent to the browser", () => {
  it("cover every namespace a public client component reads", () => {
    const used = publicClientModules().flatMap((f) => [...src(f).matchAll(/useTranslations\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(5);
    const covered = (ns: string) => CLIENT_NAMESPACES.some((c) => ns === c || ns.startsWith(`${c}.`));
    expect(used.filter((ns) => !covered(ns))).toEqual([]);
  });

  it("leave the rest on the server, in both languages", () => {
    for (const all of [es, en]) {
      const picked = pickClientMessages(all);
      expect(Object.keys(picked).sort()).toEqual(["account", "create", "cta", "footer", "home", "nav", "order", "rsvp", "waitlist"]);
      expect(Object.keys(picked.home as object)).toEqual(["menuPreview"]);
      expect(picked).not.toHaveProperty("legal");
      expect(picked).not.toHaveProperty("pos");
      expect(JSON.stringify(picked).length).toBeLessThan(JSON.stringify(all).length / 2);
    }
  });
});
