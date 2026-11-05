import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OrdersList } from "@/components/pos/OrdersList";
import { PosFrame } from "@/components/pos/PosFrame";
import { listPinStaff } from "@/lib/pos/core";
import { shiftOrders } from "@/lib/pos/sales";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/** This shift's orders: void unpaid ones, refund paid ones. */
export default async function OrdersPage() {
  const session = await currentPosSession();
  if (!session) redirect("/pos");
  const payload = await payloadClient();
  const [rows, staffList] = await Promise.all([shiftOrders(payload, session.device.id), listPinStaff(payload)]);
  const t = await getTranslations({ locale: "es", namespace: "pos" });
  return (
    <PosFrame
      wide
      aside={
        <Link href="/pos" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
          {t("shift.back")}
        </Link>
      }
    >
      <OrdersList rows={rows} approvers={staffList.filter((s) => s.role !== "barista")} />
    </PosFrame>
  );
}
