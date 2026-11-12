/**
 * The only translations the browser receives on the public site: the
 * namespaces that client components ("use client") read with
 * useTranslations. Server components translate on the server and ship
 * nothing, so the legal text, the carta copy and the like stay off the
 * wire. A test (tests/unit/client-messages.test.ts) fails if a client
 * component asks for a namespace missing here.
 */
export const CLIENT_NAMESPACES = [
  "account",
  "create",
  "cta",
  "footer",
  "home.menuPreview",
  "nav",
  "order",
  "rsvp",
  "waitlist",
] as const;

type Tree = Record<string, unknown>;

export function pickClientMessages(all: object): Tree {
  const out: Tree = {};
  for (const ns of CLIENT_NAMESPACES) {
    const parts = ns.split(".");
    let from: unknown = all;
    for (const p of parts) from = from && typeof from === "object" ? (from as Tree)[p] : undefined;
    if (from === undefined) continue;
    let to = out;
    for (const p of parts.slice(0, -1)) to = (to[p] ??= {}) as Tree;
    to[parts[parts.length - 1]] = from;
  }
  return out;
}
