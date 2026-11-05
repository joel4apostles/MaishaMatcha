"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PIN_PATTERN } from "@/lib/pos/pin";
import { loginWithPin, logoutPos, registerDevice, type PinResult } from "@/lib/pos/server";

const pinInput = z.object({
  userId: z.number().int().positive(),
  pin: z.string().regex(PIN_PATTERN),
});

export async function pinLoginAction(userId: number, pin: string): Promise<PinResult> {
  const parsed = pinInput.safeParse({ userId, pin });
  if (!parsed.success) return { ok: false, error: "wrong-pin" };
  return loginWithPin(parsed.data.userId, parsed.data.pin);
}

export async function logoutAction(): Promise<void> {
  await logoutPos();
  redirect("/pos");
}

export type RegisterState = { error?: "name" | "owner" } | undefined;

export async function registerDeviceAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "name" };
  try {
    await registerDevice(name);
  } catch {
    return { error: "owner" };
  }
  redirect("/pos");
}
