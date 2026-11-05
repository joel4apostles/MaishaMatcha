"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PIN_PATTERN } from "@/lib/pos/pin";
import { loginWithPin, logoutPos, registerDevice, type PinResult } from "@/lib/pos/server";

/** What the client needs: never the session details. */
export type PinActionResult = { ok: true } | Exclude<PinResult, { ok: true }>;

const pinInput = z.object({
  userId: z.number().int().positive(),
  pin: z.string().regex(PIN_PATTERN),
});

export async function pinLoginAction(userId: number, pin: string): Promise<PinActionResult> {
  const parsed = pinInput.safeParse({ userId, pin });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await loginWithPin(parsed.data.userId, parsed.data.pin);
  return result.ok ? { ok: true } : result;
}

export async function logoutAction(): Promise<void> {
  await logoutPos();
  redirect("/pos");
}

export type RegisterState = { error?: "name" | "owner" | "failed" } | undefined;

export async function registerDeviceAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  let result;
  try {
    result = await registerDevice(String(formData.get("name") ?? ""));
  } catch (err) {
    console.error("[pos] device registration failed", err);
    return { error: "failed" };
  }
  if (!result.ok) return { error: result.reason === "name" ? "name" : "owner" };
  redirect("/pos");
}
