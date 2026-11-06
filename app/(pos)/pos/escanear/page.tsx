import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PosFrame } from "@/components/pos/PosFrame";
import { Scanner, type ScanPo } from "@/components/pos/Scanner";
import { currentShift, loadCatalog } from "@/lib/pos/sales";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/** Scan a supplier delivery note or a paper ticket; a person confirms everything. */
export default async function ScanPage() {
  const session = await currentPosSession();
  if (!session) redirect("/pos");
  const payload = await payloadClient();
  const t = await getTranslations({ locale: "es", namespace: "pos" });
  const canReceive = session.staff.role === "owner" || session.staff.role === "manager";
  const [shift, catalog, pos] = await Promise.all([
    currentShift(payload, session.device.id),
    loadCatalog(payload),
    canReceive
      ? payload.find({
          collection: "purchase-orders",
          overrideAccess: true,
          depth: 1,
          limit: 30,
          sort: "-createdAt",
          where: { status: { in: ["sent", "partially_received"] } },
        })
      : Promise.resolve({ docs: [] }),
  ]);
  const orders: ScanPo[] = pos.docs.map((po) => ({
    id: po.id,
    label: po.label ?? String(po.id),
    supplier: typeof po.supplier === "object" && po.supplier ? po.supplier.name : "",
    lines: (po.lines ?? []).map((l, index) => ({
      index,
      name: typeof l.ingredient === "object" && l.ingredient ? l.ingredient.name : "",
      orderedPacks: l.packs,
      receivedPacks: l.receivedPacks ?? 0,
    })),
  }));
  return (
    <PosFrame
      wide
      aside={
        <Link href="/pos" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
          {t("shift.back")}
        </Link>
      }
    >
      <Scanner orders={orders} canReceive={canReceive} hasShift={Boolean(shift)} catalog={catalog} />
    </PosFrame>
  );
}
