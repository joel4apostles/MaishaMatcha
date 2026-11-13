import { cookies } from "next/headers";
import { getPayload } from "payload";
import config from "@payload-config";
import { SESSION_DAYS, memberFromSession } from "@/lib/members";

/** Cookie layer for member sessions (server components, actions, routes). */
export const MEMBER_COOKIE = "maisha_member";

export const memberCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // the emailed link is a top-level cross-site navigation
  path: "/",
  maxAge: SESSION_DAYS * 86400,
});

export async function currentMember() {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  try {
    return await memberFromSession(await getPayload({ config }), token);
  } catch {
    return null;
  }
}

export async function clearMemberSession() {
  (await cookies()).delete(MEMBER_COOKIE);
}
