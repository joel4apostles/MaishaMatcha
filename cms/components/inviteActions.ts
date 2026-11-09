"use server";

import { headers } from "next/headers";
import { getPayload } from "payload";
import { z } from "zod";
import config from "@payload-config";
import { writeAudit } from "@/cms/audit";
import { verifiedBackOffice } from "@/lib/auth/roles";
import { inviteStaff } from "@/lib/invite";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  role: z.enum(["owner", "manager"]),
});

/** Owner only, signed in with the authenticator code. */
export async function inviteAction(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!verifiedBackOffice(user, "owner")) return { ok: false as const, error: "forbidden" };
  const r = await inviteStaff(payload, parsed.data);
  if (r.ok) await writeAudit({ payload }, { action: "staff.invite", entity: "users", reason: `${parsed.data.email} (${parsed.data.role})`, actorId: user!.id });
  return r;
}
