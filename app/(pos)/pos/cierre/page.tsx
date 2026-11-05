import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PosEyebrow, PosFrame } from "@/components/pos/PosFrame";
import { CloseShiftForm } from "@/components/pos/ShiftForms";
import { currentShift, zReport } from "@/lib/pos/sales";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/** Close the till: Z report preview, counted cash, difference audited. */
export default async function CloseShiftPage() {
  const session = await currentPosSession();
  if (!session) redirect("/pos");
  const payload = await payloadClient();
  const shift = await currentShift(payload, session.device.id);
  if (!shift) redirect("/pos");
  const t = await getTranslations({ locale: "es", namespace: "pos.shift" });
  const preview = await zReport(payload, shift.id, shift.floatCents);

  return (
    <PosFrame>
      <PosEyebrow>{shift.label}</PosEyebrow>
      <h1 className="mb-8 mt-4 font-serif text-[2rem] font-light leading-tight">{t("closeTitle")}</h1>
      <CloseShiftForm preview={preview} />
    </PosFrame>
  );
}
