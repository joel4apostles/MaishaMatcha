import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { KitchenDisplay } from "@/components/pos/KitchenDisplay";
import { PosFrame } from "@/components/pos/PosFrame";
import { kitchenQueue } from "@/lib/pos/sales";
import { currentPosSession, payloadClient } from "@/lib/pos/server";

export const dynamic = "force-dynamic";

/** The bar's display: needs a registered tablet and a signed-in person. */
export default async function KdsPage() {
  const session = await currentPosSession();
  if (!session) redirect("/pos");
  const t = await getTranslations({ locale: "es", namespace: "pos" });
  const initial = await kitchenQueue(await payloadClient());
  return (
    <PosFrame
      wide
      aside={
        <div className="flex items-center gap-5">
          <h1 className="font-serif text-xl font-light">{t("kds.title")}</h1>
          <Link href="/pos" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
            {t("shift.back")}
          </Link>
        </div>
      }
    >
      <KitchenDisplay initial={initial} />
    </PosFrame>
  );
}
