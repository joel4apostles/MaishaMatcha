import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PinLogin } from "@/components/pos/PinLogin";
import { PosEyebrow, PosFrame } from "@/components/pos/PosFrame";
import { currentDevice, currentPosSession, payloadClient, pinStaff } from "@/lib/pos/server";
import { currentShift, loadCatalog } from "@/lib/pos/sales";
import { Till } from "@/components/pos/Till";
import { OpenShiftForm } from "@/components/pos/ShiftForms";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const t = await getTranslations({ locale: "es", namespace: "pos" });
  const device = await currentDevice();

  if (!device) {
    return (
      <PosFrame>
        <div className="max-w-[40rem]">
          <PosEyebrow>{t("unregistered.eyebrow")}</PosEyebrow>
          <h1 className="mt-4 font-serif text-[2rem] font-light leading-tight">
            {t("unregistered.title")}
          </h1>
          <p className="mt-4 max-w-[46ch] leading-relaxed text-sumi/85">{t("unregistered.body")}</p>
          <Link
            href="/pos/registrar"
            className="mt-8 inline-flex min-h-[52px] items-center rounded-[2px] bg-sumi px-8 text-sm font-medium tracking-wide text-washi hover:opacity-90"
          >
            {t("unregistered.action")}
          </Link>
        </div>
      </PosFrame>
    );
  }

  const session = await currentPosSession();
  if (!session) {
    return (
      <PosFrame aside={<span className="text-sm text-sumi/70">{device.name}</span>}>
        <PinLogin staff={await pinStaff()} />
      </PosFrame>
    );
  }

  const { staff } = session;
  const payload = await payloadClient();
  const shift = await currentShift(payload, device.id);
  const aside = (
    <div className="flex items-center gap-5">
      <span className="hidden text-sm text-sumi/70 md:inline">
        {staff.name} · {t(`home.role.${staff.role}`)}
      </span>
      <Link href="/kds" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
        {t("till.kds")}
      </Link>
      {shift ? (
        <Link href="/pos/pedidos" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
          {t("orders.link")}
        </Link>
      ) : null}
      <Link href="/pos/escanear" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
        {t("scan.link")}
      </Link>
      {shift ? (
        <Link href="/pos/cierre" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
          {t("shift.closeLink")}
        </Link>
      ) : null}
      {staff.role !== "barista" ? (
        <Link href="/admin" className="hidden min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4 sm:inline-flex">
          {t("home.backOffice")}
        </Link>
      ) : null}
      <form action={logoutAction}>
        <button type="submit" className="inline-flex min-h-[44px] items-center text-sm underline decoration-wood/50 underline-offset-4">
          {t("home.logout")}
        </button>
      </form>
    </div>
  );

  if (!shift) {
    return (
      <PosFrame aside={aside}>
        <OpenShiftForm />
      </PosFrame>
    );
  }

  return (
    <PosFrame aside={aside} wide>
      <Till catalog={await loadCatalog(payload)} />
    </PosFrame>
  );
}
